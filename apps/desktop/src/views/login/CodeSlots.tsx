import { useState } from 'react'

import './code-slots.css'

import type { RefObject } from 'react'

export const CODE_LENGTH = 6

type Props = {
  value: string
  onChange: (value: string) => void
  inputRef: RefObject<HTMLInputElement | null>
  /** Id of the visible "Enter the 6-digit code…" line, read as the field's name. */
  labelledBy: string
}

type Selection = { start: number; end: number }

/**
 * The email code as ONE text field drawn as six slots. The real input sits on top,
 * transparent, so paste, backspace, one-time-code autofill and screen readers all
 * see a single field; the slots only mirror its value and caret.
 */
export function CodeSlots({ value, onChange, inputRef, labelledBy }: Props) {
  const [focused, setFocused] = useState(false)
  const [sel, setSel] = useState<Selection>({ start: 0, end: 0 })
  const caret = Math.min(sel.start, CODE_LENGTH - 1)

  function track(el: HTMLInputElement) {
    setSel({ start: el.selectionStart ?? el.value.length, end: el.selectionEnd ?? el.value.length })
  }

  return (
    <div className="code-slots titlebar-no-drag">
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          track(e.target)
        }}
        onSelect={(e) => track(e.currentTarget)}
        onFocus={(e) => {
          setFocused(true)
          track(e.currentTarget)
        }}
        onBlur={() => setFocused(false)}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        spellCheck={false}
        aria-labelledby={labelledBy}
        // The slots show where typing goes; keyboard focus also rings the whole row.
        className="code-slots-input rounded-[12px] focus-visible:ring-2 focus-visible:ring-zViolet-accent focus-visible:ring-offset-4"
      />
      <div className="code-slots-row" aria-hidden="true">
        {Array.from({ length: CODE_LENGTH }, (_, i) => {
          const selected = focused && sel.end > sel.start && i >= sel.start && i < sel.end
          const active = focused && sel.end === sel.start && i === caret

          return (
            <span key={i} className="code-slot" data-active={active || selected}>
              {value[i] ?? ''}
              {active && i >= value.length && <span className="code-slot-caret" />}
            </span>
          )
        })}
      </div>
    </div>
  )
}
