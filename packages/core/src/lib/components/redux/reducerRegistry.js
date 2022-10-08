import { ADD_ALERT, REQUEST_END, ADD_APP_STATE, REMOVE_ALERT, SET_ALERT } from './eventTypes.js'

let _emitChange = null;
let reducers = {
  alerts: (state = [], action) => {
    if (action.type === SET_ALERT) {
      if (action.payload.alerts !== undefined) {
        return action.payload.alerts.map((a) => { a['key'] = Math.random().toString(36).substr(2, 9); return a; });
      }
    }
    if (action.type === ADD_ALERT) {
      if (action.payload.alerts !== undefined) {
        return state.concat(action.payload.alerts.map((a) => { a['key'] = Math.random().toString(36).substr(2, 9); return a; }));
      }
    }
    if (action.type === REMOVE_ALERT) {
      if (action.payload.key !== undefined) {
        return state.filter((a, i) => a.key != action.payload.key);
      }
    }

    return state;
  },
  appState: (state = [], action = {}) => {
    if (action.type === ADD_APP_STATE) {
      let newState = action.payload.appState;
      if (newState !== undefined) {
        return {
          ...state,
          ...newState
        }
      }
    } else if (action.type === REQUEST_END) {
      if (_.get(action.payload, 'data.appState') !== undefined) {
        let newState = action.payload.data.appState;
        return {
          ...state,
          ...newState
        }
      }
    }
    return state;
  }
};
let ReducerRegistry = {};

ReducerRegistry.getReducers = function () {
  return { ...reducers };
};

ReducerRegistry.register = function (name, reducer) {
  reducers = { ...reducers, [name]: reducer };
  if (_emitChange) {
    _emitChange(this.getReducers());
  }
};

ReducerRegistry.setChangeListener = function (listener) {
  _emitChange = listener;
};

export { ReducerRegistry }