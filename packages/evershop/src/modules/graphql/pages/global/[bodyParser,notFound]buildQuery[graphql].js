import { readFileSync } from 'fs';
import path from 'path';
import JSON5 from 'json5';
import uniqid from 'uniqid';
import { getDevMiddleware } from '../../../../bin/lib/devEnvHelper.js';
import { CONSTANTS } from '../../../../lib/helpers.js';
import { error } from '../../../../lib/log/logger.js';
import { getRoutes } from '../../../../lib/router/Router.js';
import { get } from '../../../../lib/util/get.js';
import isDevelopmentMode from '../../../../lib/util/isDevelopmentMode.js';
import isProductionMode from '../../../../lib/util/isProductionMode.js';
import { getRouteBuildPath } from '../../../../lib/webpack/getRouteBuildPath.js';
import { getEnabledWidgets } from '../../../../lib/widget/widgetManager.js';
import { loadWidgetInstances } from '../../../cms/services/widget/loadWidgetInstances.js';
import { getContextValue } from '../../services/contextHelper.js';

export default async (request, response, next) => {
  try {
    let query;
    getContextValue(request, 'dummy', null);
    if (isDevelopmentMode()) {
      const route = request.currentRoute;
      const devMiddleware = getDevMiddleware(route.isAdmin);
      const { outputFileSystem } = devMiddleware.context;

      // Wait for webpack to be ready
      await new Promise((resolve) => {
        devMiddleware.waitUntilValid(() => resolve());
      });

      const { stats } = devMiddleware.context;
      if (!stats) {
        throw new Error('Webpack stats not available');
      }

      const jsonWebpackStats = stats.toJson();
      const { outputPath } = jsonWebpackStats;

      const queryPath = path.resolve(outputPath, `query-${route.id}.graphql`);
      query = outputFileSystem.readFileSync(queryPath, 'utf8');
    } else if (isProductionMode()) {
      const routes = getRoutes();
      const route = request.currentRoute;
      const subPath = getRouteBuildPath(route);
      const queryPath = path.resolve(
        CONSTANTS.BUILDPATH,
        subPath,
        'server',
        'query.graphql'
      );
      query = readFileSync(queryPath, 'utf8');
    }
    const widgetInstances = await loadWidgetInstances(request);
    const enabledWidgets = getEnabledWidgets();
    if (query) {
      // Parse the query
      // Use regex to replace "getContextValue_'base64 encoded string'"
      // from the query to the actual function
      const regex = /\\"getContextValue_([a-zA-Z0-9+/=]+)\\"/g;
      query = query.replace(regex, (match, p1) => {
        const base64 = p1;
        const decoded = Buffer.from(base64, 'base64').toString('ascii');
        let value = eval(`getContextValue(request, ${decoded})`);

        // JSON sringify without adding double quotes to the property name
        value = JSON5.stringify(value, { quote: '"' });
        // Escape the value so we can insert it into the query
        if (value) {
          value = value.replace(/"/g, '\\"');
        }
        return value;
      });
      const json = JSON5.parse(query);
      // We need to get the list of applicable widgets and remove all the queries and variable that are not used
      let applicableWidgets = [];
      const { currentRoute } = request;
      if (
        currentRoute?.isAdmin === false ||
        ['widgetNew', 'widgetEdit'].includes(currentRoute?.id)
      ) {
        applicableWidgets = widgetInstances.map((widget) => {
          const widgetSpecs = enabledWidgets.find(
            (enabledWidget) => enabledWidget.type === widget.type
          );
          const componentPath = currentRoute?.isAdmin
            ? widgetSpecs.settingComponent
            : widgetSpecs.component;
          const componentKey = currentRoute?.isAdmin
            ? widgetSpecs.settingComponentKey
            : widgetSpecs.componentKey;
          return {
            uuid: widget.uuid,
            type: widget.type,
            settings: widget.settings,
            component: componentPath,
            componentKey
          };
        });
      }

      let operation = 'query Query';
      const { fragments } = json;
      const { propsMap } = json;
      let queryStr = '';
      let variables;
      if (applicableWidgets.length > 0) {
        applicableWidgets.forEach((widget) => {
          const widgetKey = widget.componentKey;
          let widgetQuery = json.queries[widgetKey];
          // Deep clone the widget variables
          let widgetVariables = JSON.parse(
            JSON.stringify(json.variables[widgetKey])
          );
          const regex = /\\"getWidgetSetting_([a-zA-Z0-9+/=]*)\\"/g;
          widgetQuery = widgetQuery.replace(regex, (match, p1) => {
            const base64 = p1;
            const decoded = Buffer.from(base64, 'base64').toString('ascii');
            // Accept max 2 arguments from the decoded string, the fist one is the path to the setting object (a.b.c) and the second one is the default value
            // Get the actual value from the setting of the current widget

            const path = decoded.split(',')[0];
            const defaultValue = decoded.split(',')[1] || undefined;
            let value = get(widget.settings, path, defaultValue);
            // JSON sringify without adding double quotes to the property name
            value = JSON5.stringify(value, { quote: '"' });
            // Escape the value so we can insert it into the query
            if (value) {
              value = value.replace(/"/g, '\\"');
            }
            return value;
          });
          // Use regex to find if there is any variable inside the query by checking if there is any string started with `$variable_` and no special character after that. If there is a match, we will replace it with the another unique name to make it unique
          const variableRegex = /\$variable_([a-zA-Z0-9]+)/g;
          const variableMatch = widgetQuery.match(variableRegex);
          const variableList = [];
          if (variableMatch) {
            widgetQuery = widgetQuery.replace(variableRegex, (match, p1) => {
              const newId = `${uniqid()}`;
              variableList.push({
                origin: `variable_${p1}`,
                new: `variable_${newId}`
              });
              // Check if p1 already exists in the variableList
              // If it does, we will replace it with the newId
              const test = variableList.find(
                (variable) => variable.origin === `variable_${p1}`
              );
              if (test) {
                return `$${test.new}`;
              } else {
                return `$variable_${newId}`;
              }
            });
          }

          // Now we need to process the widgetVariables.values and widgetVariables.defs
          const widgetVariablesValues = Object.keys(
            widgetVariables.values
          ).reduce((acc, key) => {
            const check = variableList.find(
              (variable) => variable.origin === key
            );
            if (check) {
              const variableRegex = /getWidgetSetting_([a-zA-Z0-9+/=]*)/g;
              const v = widgetVariables.values[key];
              if (typeof v === 'string') {
                // A regext matching "getContextValue_'base64 encoded string'"
                // Check if the value is a string and contains the getContextValue_ string
                const variableMatch = v.match(variableRegex);
                if (variableMatch) {
                  // Replace the getContextValue_ string with the actual function
                  const base64 = variableMatch[0].replace(
                    variableRegex,
                    (match, p1) => p1
                  );
                  const decoded = Buffer.from(base64, 'base64')
                    .toString('ascii')
                    .split(',')[0]
                    .replace(/['"]+/g, '');

                  let actualValue;
                  if (!decoded.trim()) {
                    actualValue = widget.settings;
                  } else {
                    actualValue = get(widget.settings, decoded);
                  }
                  acc[check.new] = actualValue;
                }
              } else {
                acc[check.new] = v;
              }
            }
            return acc;
          }, {});
          const widgetVariablesDefs = widgetVariables.defs.reduce(
            (acc, variable) => {
              const check = variableList.find(
                (v) => v.origin === variable.alias
              );
              if (check) {
                acc.push({
                  ...variable,
                  alias: check.new
                });
              } else {
                acc.push(variable);
              }
              return acc;
            },
            []
          );
          widgetVariables = {
            values: widgetVariablesValues,
            defs: widgetVariablesDefs
          };
          const originPropsMap = propsMap[widgetKey]; // [{origin: 'real field name', alias: 'bbbb'}, {origin: 'real field name', alias: 'ccc'}]
          const widgetUUID = `e${widget.uuid.replace(/-/g, '')}`;
          propsMap[widgetUUID] = [];
          originPropsMap.forEach((prop) => {
            const newAlias = `e${uniqid()}`;
            widgetQuery = widgetQuery.replace(prop.alias, newAlias);
            propsMap[widgetUUID].push({
              origin: prop.origin,
              alias: newAlias
            });
          });
          json.queries[widgetUUID] = widgetQuery;
          json.variables[widgetUUID] = widgetVariables;
          // Now we merge the queries to the query as the string,
          queryStr = Object.keys(json.queries).reduce((acc, key) => {
            if (
              !enabledWidgets.find(
                (widget) =>
                  widget.componentKey === key ||
                  widget.settingComponentKey === key
              )
            ) {
              acc += `\n${json.queries[key]} `;
            }
            return acc;
          }, '');

          // Now we merge the variables
          variables = Object.keys(json.variables).reduce(
            (acc, key) => {
              if (
                !enabledWidgets.find(
                  (widget) =>
                    widget.componentKey === key ||
                    widget.settingComponentKey === key
                )
              ) {
                acc.values = { ...acc.values, ...json.variables[key].values };
                acc.defs = [...acc.defs, ...json.variables[key].defs];
              }
              return acc;
            },
            { values: {}, defs: [] }
          );
        });
      } else {
        // Just delete resolvable queries and variables
        queryStr = Object.keys(json.queries).reduce((acc, key) => {
          if (
            enabledWidgets.find(
              (widget) =>
                widget.componentKey === key ||
                widget.settingComponentKey === key
            )
          ) {
            delete json.queries[key];
          } else {
            acc += `\n${json.queries[key]} `;
          }
          return acc;
        }, '');

        variables = Object.keys(json.variables).reduce(
          (acc, key) => {
            if (
              enabledWidgets.find(
                (widget) =>
                  widget.componentKey === key ||
                  widget.settingComponentKey === key
              )
            ) {
              delete json.variables[key];
            } else {
              acc.values = { ...acc.values, ...json.variables[key].values };
              acc.defs = [...acc.defs, ...json.variables[key].defs];
            }
            return acc;
          },
          { values: {}, defs: [] }
        );
      }
      if (variables.defs.length > 0) {
        const variablesString = variables.defs
          .map((variable) => `$${variable.alias}: ${variable.type}`)
          .join(', ');
        operation += `(${variablesString})`;

        // Now we need loop through all variables value (variables.values) object and Use regex to replace "getContextValue_'base64 encoded string'" from the query to the actual function
        Object.keys(variables.values).forEach((key) => {
          const value = variables.values[key];
          if (typeof value === 'string') {
            // A regext matching "getContextValue_'base64 encoded string'"
            const variableRegex = /getContextValue_([a-zA-Z0-9+/=]+)/g;
            // Check if the value is a string and contains the getContextValue_ string
            const variableMatch = value.match(variableRegex);
            if (variableMatch) {
              // Replace the getContextValue_ string with the actual function
              const base64 = variableMatch[0].replace(
                variableRegex,
                (match, p1) => p1
              );
              const decoded = Buffer.from(base64, 'base64').toString('ascii');

              const actualValue = eval(`getContextValue(request, ${decoded})`);
              variables.values[key] = actualValue;
            }
          }
        });
      }
      request.body.graphqlQuery = `${operation} { ${queryStr} } ${fragments}`;
      request.body.graphqlVariables = variables.values;
      request.body.propsMap = propsMap;
      next();
    }
  } catch (e) {
    error(e);
    throw error;
  }
};
