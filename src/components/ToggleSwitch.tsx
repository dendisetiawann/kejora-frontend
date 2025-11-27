import { FC } from 'react';

interface ToggleSwitchProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
    isLoading?: boolean;
}

const ToggleSwitch: FC<ToggleSwitchProps> = ({
    checked,
    onChange,
    disabled = false,
    isLoading = false,
}) => {
    const handleClick = () => {
        if (!disabled && !isLoading) {
            onChange(!checked);
        }
    };

    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={handleClick}
            disabled={disabled || isLoading}
            className={`
        relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2
        ${checked ? 'bg-emerald-500' : 'bg-rose-500'}
        ${disabled || isLoading ? 'opacity-50 cursor-not-allowed' : ''}
      `}
        >
            <span className="sr-only">Use setting</span>
            <span
                aria-hidden="true"
                className={`
          pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out flex items-center justify-center
          ${checked ? 'translate-x-6' : 'translate-x-0'}
        `}
            >
                {isLoading && (
                    <svg
                        className="animate-spin h-4 w-4 text-gray-500"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                    >
                        <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                        ></circle>
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                    </svg>
                )}
            </span>
        </button>
    );
};

export default ToggleSwitch;
