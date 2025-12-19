import React, { useEffect, useMemo, useRef, useState } from 'react';

export type AmountInputValue = number | '';

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange' | 'inputMode'> & {
    value: AmountInputValue;
    onValueChange: (value: AmountInputValue) => void;
    allowDecimal?: boolean;
};

const ARABIC_INDIC_DIGITS: Record<string, string> = {
    '٠': '0',
    '١': '1',
    '٢': '2',
    '٣': '3',
    '٤': '4',
    '٥': '5',
    '٦': '6',
    '٧': '7',
    '٨': '8',
    '٩': '9',
};

function toLatinDigits(value: string): string {
    return value.replace(/[٠-٩]/g, (d) => ARABIC_INDIC_DIGITS[d] ?? d);
}

function sanitizeRawInput(value: string, allowDecimal: boolean): string {
    const latin = toLatinDigits(value)
        .replace(/[\s,_،٬]/g, '')
        .replace(/\u066B/g, '.'); // Arabic decimal separator

    if (!allowDecimal) {
        return latin.replace(/[^0-9]/g, '');
    }

    // Keep digits and at most one dot
    let out = '';
    let dotSeen = false;
    for (const ch of latin) {
        if (ch >= '0' && ch <= '9') {
            out += ch;
            continue;
        }
        if (ch === '.' && !dotSeen) {
            dotSeen = true;
            out += ch;
        }
    }
    return out;
}

function formatWithThousandsSeparators(raw: string): string {
    if (!raw) return '';

    const [intPartRaw, fracPart] = raw.split('.');

    // Preserve leading zeros, but still apply grouping.
    const intPart = intPartRaw.replace(/^0+(?=\d)/, (m) => m); // no-op but keeps intent explicit
    const digits = intPart.replace(/\D/g, '');

    // Group from the end.
    const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    if (fracPart === undefined) return grouped;
    return `${grouped}.${fracPart}`;
}

function countRelevantChars(raw: string, allowDecimal: boolean): number {
    const sanitized = sanitizeRawInput(raw, allowDecimal);
    // Count digits and dot (if allowed) to keep caret stable.
    return allowDecimal ? sanitized.length : sanitized.replace(/\D/g, '').length;
}

function findCaretPosition(formatted: string, targetCount: number, allowDecimal: boolean): number {
    if (targetCount <= 0) return 0;
    let count = 0;
    for (let i = 0; i < formatted.length; i++) {
        const ch = formatted[i];
        const isRelevant = (ch >= '0' && ch <= '9') || (allowDecimal && ch === '.');
        if (isRelevant) count++;
        if (count >= targetCount) return i + 1;
    }
    return formatted.length;
}

const AmountInput: React.FC<Props> = ({ value, onValueChange, allowDecimal = true, className, ...rest }) => {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [isComposing, setIsComposing] = useState(false);

    const displayValue = useMemo(() => {
        if (value === '') return '';
        if (!Number.isFinite(value)) return '';
        const raw = String(value);
        const sanitized = sanitizeRawInput(raw, allowDecimal);
        return formatWithThousandsSeparators(sanitized);
    }, [value, allowDecimal]);

    // Keep DOM input in sync (React does this anyway, but we also rely on ref for caret handling)
    useEffect(() => {
        if (!inputRef.current) return;
        // no-op: controlled input
    }, [displayValue]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (isComposing) return;

        const input = e.target;
        const before = input.value;
        const caret = input.selectionStart ?? before.length;

        const leftCount = countRelevantChars(before.slice(0, caret), allowDecimal);
        const sanitized = sanitizeRawInput(before, allowDecimal);
        const formatted = formatWithThousandsSeparators(sanitized);

        // Update numeric value upstream
        if (sanitized === '' || sanitized === '.') {
            onValueChange('');
        } else {
            const next = Number.parseFloat(sanitized);
            onValueChange(Number.isFinite(next) ? next : '');
        }

        // Restore caret after React updates value
        requestAnimationFrame(() => {
            const el = inputRef.current;
            if (!el) return;
            const nextPos = findCaretPosition(formatted, leftCount, allowDecimal);
            try {
                el.setSelectionRange(nextPos, nextPos);
            } catch {
                // ignore
            }
        });
    };

    return (
        <input
            {...rest}
            ref={inputRef}
            type="text"
            inputMode={allowDecimal ? 'decimal' : 'numeric'}
            value={displayValue}
            onChange={handleChange}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            className={className}
        />
    );
};

export default AmountInput;
