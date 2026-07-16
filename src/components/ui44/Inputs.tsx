import type {
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

type Ui44InputSurface = 'field' | 'bare';

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function Ui44TextInput({
  className = '',
  surface = 'field',
  type,
  value,
  defaultValue,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { surface?: Ui44InputSurface }) {
  const choiceLikeType = type === 'date' || type === 'datetime-local' || type === 'month' || type === 'time' || type === 'week';
  const emptyChoice = choiceLikeType && (value === '' || (value === undefined && defaultValue === ''));
  return <input
    type={type}
    value={value}
    defaultValue={defaultValue}
    className={joinClasses('ui44-input', surface === 'bare' && 'ui44-input-bare', emptyChoice && 'ui44-input-empty', className)}
    {...props}
  />;
}

export function Ui44Textarea({
  className = '',
  surface = 'field',
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { surface?: Ui44InputSurface }) {
  return <textarea
    className={joinClasses(
      'ui44-input',
      'ui44-textarea',
      surface === 'bare' && 'ui44-input-bare',
      className,
    )}
    {...props}
  />;
}

export function Ui44SelectInput({
  className = '',
  children,
  value,
  defaultValue,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  const emptyChoice = value === '' || (value === undefined && defaultValue === '');
  return <div className="ui44-select-control">
    <select
      value={value}
      defaultValue={defaultValue}
      className={joinClasses('ui44-input', 'ui44-input-select', emptyChoice && 'ui44-input-empty', className)}
      {...props}
    >
      {children}
    </select>
    <span className="ui44-select-caret" aria-hidden="true" />
  </div>;
}

export function Ui44CheckboxInput({
  className = '',
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  return <input
    type="checkbox"
    className={joinClasses('ui44-native-input', 'ui44-checkbox-input', className)}
    {...props}
  />;
}

export function Ui44RangeInput({
  className = '',
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  return <input
    type="range"
    className={joinClasses('ui44-native-input', 'ui44-range-input', className)}
    {...props}
  />;
}

export function Ui44FileInput({
  className = '',
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  return <input
    type="file"
    className={joinClasses('ui44-native-input', 'ui44-file-input', className)}
    {...props}
  />;
}
