type Hook = {
  callback: Function;
  priority: number;
};

export enum HookPosition {
  BEFORE = 'before',
  AFTER = 'after'
}

type HookStorage = Map<string, Hook[]>;

const beforeHooks: HookStorage = new Map();
const afterHooks: HookStorage = new Map();
let locked = false;

function isAsyncFunction(func: Function): boolean {
  return func.constructor.name === 'AsyncFunction';
}

function hook(
  funcName: string,
  callback: Function,
  priority: number = 10,
  position: HookPosition = HookPosition.BEFORE
): void {
  if (locked) {
    throw new Error(
      'Hooks are locked. You should consider adding hooks using the bootstrap function'
    );
  }
  if (typeof callback !== 'function') {
    throw new Error('Callback must be a function');
  }

  if (typeof priority !== 'number') {
    throw new Error('Priority must be a number');
  }

  const storage = position === HookPosition.BEFORE ? beforeHooks : afterHooks;

  if (!storage.has(funcName)) {
    storage.set(funcName, []);
  }

  const hooks = storage.get(funcName)!;
  hooks.push({ callback, priority });
  hooks.sort((a, b) => a.priority - b.priority);
}

export function hookAfter(
  funcName: string,
  callback: Function,
  priority: number = 10
): void {
  hook(funcName, callback, priority, HookPosition.AFTER);
}

export function hookBefore(
  funcName: string,
  callback: Function,
  priority: number = 10
): void {
  hook(funcName, callback, priority, HookPosition.BEFORE);
}

export function hookable<T extends Function>(
  originalFunction: T,
  context?: any
): T {
  // Make sure the original function is a named function
  const funcName = originalFunction.name.replace('bound ', '');
  if (!funcName) {
    throw new Error('The original function must be a named function');
  }
  return new Proxy(originalFunction, {
    apply: isAsyncFunction(originalFunction)
      ? async function (target, thisArg, argumentsList) {
          const beforeHookFunctions = beforeHooks.get(funcName) || [];
          const afterHookFunctions = afterHooks.get(funcName) || [];

          for (let index = 0; index < beforeHookFunctions.length; index += 1) {
            const callbackFunc = beforeHookFunctions[index].callback;
            // Call the callback function with the cloned arguments
            await callbackFunc.call(context, ...argumentsList);
          }

          const result = await Reflect.apply(target, thisArg, argumentsList);

          for (let index = 0; index < afterHookFunctions.length; index += 1) {
            const callbackFunc = afterHookFunctions[index].callback;
            await callbackFunc.call(context, result, ...argumentsList);
          }
          return result;
        }
      : function (target, thisArg, argumentsList) {
          const beforeHookFunctions = beforeHooks.get(funcName) || [];
          const afterHookFunctions = afterHooks.get(funcName) || [];
          // Clone the argumentsList to avoid mutation
          beforeHookFunctions.forEach((hook) => {
            hook.callback.call(context, ...argumentsList);
          });

          const result = Reflect.apply(target, thisArg, argumentsList);

          afterHookFunctions.forEach((hook) => {
            hook.callback.call(context, result, ...argumentsList);
          });
          return result;
        }
  }) as T;
}

export function getHooks(): {
  beforeHooks: HookStorage;
  afterHooks: HookStorage;
} {
  return {
    beforeHooks,
    afterHooks
  };
}

export function clearHooks(): void {
  beforeHooks.clear();
  afterHooks.clear();
}

export function lockHooks(): void {
  locked = true;
}
