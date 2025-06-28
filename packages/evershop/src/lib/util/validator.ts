export type Validator<T> = {
  id: string;
  func: (input: T) => boolean | Promise<boolean>;
  errorMessage: string;
};

export class ValidatorManager<T> {
  private validators = new Map<string, Validator<T>>();

  constructor(initial: Validator<T>[] = []) {
    for (const v of initial) {
      this.add(v);
    }
  }

  add(validator: Validator<T>) {
    this.validators.set(validator.id, validator);
  }

  async validate(input: T) {
    const results = await Promise.allSettled(
      Array.from(this.validators.values()).map(async (validator) => {
        try {
          const isValid = await validator.func(input);
          return isValid ? null : validator.errorMessage;
        } catch (err: any) {
          return `${validator.errorMessage} (exception occurred)`;
        }
      })
    );

    const errors = results
      .map((r) =>
        r.status === 'fulfilled' ? r.value : 'Unknown validation error'
      )
      .filter((msg): msg is string => !!msg);

    return {
      valid: errors.length === 0,
      errors
    };
  }

  getAllIds() {
    return Array.from(this.validators.keys());
  }

  getValidator(id: string) {
    return this.validators.get(id);
  }

  remove(id: string) {
    this.validators.delete(id);
  }

  clear() {
    this.validators.clear();
  }
}
