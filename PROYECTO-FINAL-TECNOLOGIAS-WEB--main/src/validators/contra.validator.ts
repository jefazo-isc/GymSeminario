import { AbstractControl, ValidationErrors } from '@angular/forms';

export function ContraValidator(control: AbstractControl): ValidationErrors | null {
  const value: string = control.value || '';
  const errors: any = {};

  if (!/[A-Z]/.test(value)) {
    errors.missingUppercase = true;
  }

  if (!/\d/.test(value)) {
    errors.missingNumber = true;
  }

  if (value.length < 6 || value.length > 16) {
    errors.invalidLength = true;
  }

  return Object.keys(errors).length > 0 ? errors : null;
}
