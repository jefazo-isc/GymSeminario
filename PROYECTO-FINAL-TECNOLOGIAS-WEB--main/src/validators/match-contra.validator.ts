import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function matchContra(passwordKey: string, confirmPasswordKey: string): ValidatorFn {
  return (form: AbstractControl): ValidationErrors | null => {
    const password = form.get(passwordKey)?.value;
    const confirmPassword = form.get(confirmPasswordKey)?.value;

    if (password !== confirmPassword) {
      form.get(confirmPasswordKey)?.setErrors({ mismatch: true });
    } else {
      // Solo borramos si ya hay mismatch
      const errors = form.get(confirmPasswordKey)?.errors;
      if (errors && errors['mismatch']) {
        delete errors['mismatch'];
        if (Object.keys(errors).length === 0) {
          form.get(confirmPasswordKey)?.setErrors(null);
        } else {
          form.get(confirmPasswordKey)?.setErrors(errors);
        }
      }
    }
    return null;
  };
}
