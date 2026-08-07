import isEqual from 'react-fast-compare';

let locked = false;

export type RegistryValue<T> = {
  initValue: T;
  context: Record<string, any>;
  value: T;
  processors: {
    callback: SyncProcessor<T> | AsyncProcessor<T>;
    priority: number;
  }[];
};

export type SyncProcessor<T> = (value: T) => T;
export type AsyncProcessor<T> = (value: T) => Promise<T>;

class Registry {
  values: Record<string, Partial<RegistryValue<any>>> = {};

  async get<T>(
    name: string,
    initValue: T,
    context?: Record<string, any>,
    validator?: (value: T) => boolean
  ) {
    if (this.values[name]) {
      // If the initValue and the context are identical, return the cached value. Skip the processors
      if (
        isEqual(initValue, this.values[name].initValue) &&
        isEqual(this.values[name].context, context) &&
        Object.prototype.hasOwnProperty.call(this.values[name], 'value')
      ) {
        return this.values[name].value;
      }
    }

    // Cache the initValue and the context
    this.values[name] = this.values[name] || ({} as RegistryValue<T>);
    this.values[name].initValue = initValue;
    this.values[name].context = context;

    // If there is no processor, return the init value
    if (!this.values[name].processors) {
      this.values[name].value = initValue;
      return initValue;
    }

    const { processors } = this.values[name];
    // Call the list of processors, returned value will be passed to the next processor. Start with the init value
    let value = initValue;
    for (let i = 0; i < processors.length; i += 1) {
      const { callback } = processors[i];
      value = await callback.call(context, value);
      if (value === undefined) {
        // eslint-disable-next-line no-console
        console.log(
          `\x1b[33m⚠️ The processor for the value '${name}' is not returning anything. This may cause unexpected behavior.\x1b[0m`
        );
      }
      // Validate the value if the validator is provided and it is a function
      if (typeof validator === 'function') {
        const validateResult = validator(value);
        if (validateResult !== true) {
          throw new Error(`Value ${name} is invalid: ${validateResult}`);
        }
      }
    }

    // Cache the value
    this.values[name].value = value;
    return value;
  }

  getSync<T>(
    name: string,
    initValue: T,
    context?: Record<string, any>,
    validator?: (value: T) => boolean
  ) {
    const validateFunc = (value: T) => {
      // Check if value is a promise
      if (
        value !== null &&
        typeof value === 'object' &&
        typeof (value as unknown as Promise<any>).then === 'function'
      ) {
        throw new Error(
          `The 'getSync' function does not support async processor. Please use 'get' function instead`
        );
      } else if (typeof validator === 'function') {
        return validator(value);
      } else {
        return true;
      }
    };

    if (this.values[name]) {
      // If the initValue and the context are identical, return the cached value. Skip the processors
      if (
        isEqual(initValue, this.values[name].initValue) &&
        isEqual(this.values[name].context, context) &&
        Object.prototype.hasOwnProperty.call(this.values[name], 'value')
      ) {
        return this.values[name].value;
      }
    }

    // Cache the initValue and the context
    this.values[name] = this.values[name] || ({} as RegistryValue<T>);
    this.values[name].initValue = initValue;
    this.values[name].context = context;

    // If there is no processor, return the init value
    if (!this.values[name].processors) {
      this.values[name].value = initValue;
      return initValue;
    }

    const { processors } = this.values[name];
    // Call the list of processors, returned value will be passed to the next processor. Start with the init value
    let value = initValue;
    for (let i = 0; i < processors.length; i += 1) {
      const { callback } = processors[i];
      value = callback.call(context, value);
      // Check if the callback function not returning anything
      if (value === undefined) {
        // eslint-disable-next-line no-console
        console.log(
          `\x1b[33m⚠️ The processor for the value '${name}' is not returning anything. This may cause unexpected behavior.\x1b[0m`
        );
      }
      // Validate the value if the validator is provided and it is a function
      const validateResult = validateFunc(value);
      if (validateResult !== true) {
        throw new Error(`Value ${name} is invalid`);
      }
    }

    // Cache the value
    this.values[name].value = value;
    return value;
  }

  addProcessor<T>(
    name: string,
    callback: SyncProcessor<T> | AsyncProcessor<T>,
    priority?: number
  ) {
    if (locked) {
      throw new Error(
        'Registry is locked. Most likely you are trying to add a processor from a middleware. Consider using a bootstrap file to add processors'
      );
    }
    if (typeof priority === 'undefined') {
      priority = 10;
    }
    // Throw error if priority is not a number
    if (typeof priority !== 'number') {
      throw new Error('Priority must be a number');
    }

    // Throw error if the priority is bigger than 1000
    if (priority > 1000) {
      throw new Error('Priority must be smaller than 1000');
    }

    // Throw error if callback is not a function or async function
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }
    if (!this.values[name]) {
      this.values[name] = {
        processors: []
      } as Partial<RegistryValue<any>>;
    }
    this.values[name].processors = this.values[name].processors || [];
    // Add the callback to the processors, sort by priority
    const { processors } = this.values[name];
    processors.push({
      callback,
      priority
    });
    processors.sort((a, b) => a.priority - b.priority);
  }

  addFinalProcessor<T>(
    name: string,
    callback: SyncProcessor<T> | AsyncProcessor<T>
  ): void {
    // Check if there is already a final processor base on the priority
    const processors = this.values[name]?.processors || [];
    if (processors.find((p) => p.priority === 1000)) {
      throw new Error(
        `There is already a final processor for the value ${name}`
      );
    }
    this.addProcessor(name, callback, 1000);
  }

  getProcessors(name: string): {
    callback: SyncProcessor<any> | AsyncProcessor<any>;
    priority: number;
  }[] {
    if (!this.values[name]) {
      throw new Error(`The value ${name} is not registered`);
    }
    return this.values[name].processors || [];
  }
}

const registry = new Registry();

/**
 * Get the value from the registry
 * @param name - The name of the value
 * @param initialization - The initialization value or a function that returns the value
 * @param context - The context of the value
 * @param validator - The validator function
 * @returns The value from the registry
 */
export async function getValue<T>(
  name: string,
  initialization: T | AsyncProcessor<T> | SyncProcessor<T>,
  context?: Record<string, any>,
  validator?: (value: T) => boolean
): Promise<T> {
  let initValue;
  const value = registry.values[name] || ({} as RegistryValue<T>);
  // Check if the initValue is a function, then add this function to the processors as the first processor
  if (typeof initialization === 'function') {
    // Add this function to the biginning of the processors
    const processors = value.processors || [];
    processors.unshift({
      callback: initialization as SyncProcessor<T> | AsyncProcessor<T>,
      priority: 0
    });
    registry.values[name] = {
      ...value,
      processors
    };
    initValue = value.initValue;
  } else {
    initValue = initialization as T;
  }
  const val = await registry.get(name, initValue, context, validator);
  return val;
}

/**
 * Get the value from the registry
 * @param name - The name of the value
 * @param initialization - The initialization value or a function that returns the value
 * @param context - The context of the value
 * @param validator - The validator function
 * @returns The value from the registry
 */
export function getValueSync<T>(
  name: string,
  initialization: T | SyncProcessor<T>,
  context: Record<string, any>,
  validator?: (value: T) => boolean
): T {
  let initValue;
  // Check if the initValue is a function, then add this function to the processors as the first processor
  if (typeof initialization === 'function') {
    // Add this function to the processors, add this to the biginning of the processors
    const processors = registry.values[name]?.processors || [];
    processors.unshift({
      callback: initialization as SyncProcessor<T>,
      priority: 0
    });
    registry.values[name] = registry.values[name] || ({} as RegistryValue<T>);
    registry.values[name].processors = processors;
    initValue = registry.values[name].initValue;
  } else {
    initValue = initialization;
  }
  const val = registry.getSync(name, initValue, context, validator);
  return val;
}

export function addProcessor<T>(
  name: string,
  callback: SyncProcessor<T> | AsyncProcessor<T>,
  priority?: number
): void {
  return registry.addProcessor(name, callback, priority);
}

export function addFinalProcessor(
  name: string,
  callback: SyncProcessor<any> | AsyncProcessor<any>
): void {
  return registry.addFinalProcessor(name, callback);
}

export function getProcessors<T>(name: string): {
  callback: SyncProcessor<T> | AsyncProcessor<T>;
  priority: number;
}[] {
  return registry.getProcessors(name);
}

export function lockRegistry(): void {
  // Reset the values cache by removing all values from all properties in the registry values
  Object.keys(registry.values).forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(registry.values, key)) {
      delete registry.values[key].value;
    }
  });
  locked = true;
}
