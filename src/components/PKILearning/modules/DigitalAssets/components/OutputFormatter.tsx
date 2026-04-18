// SPDX-License-Identifier: GPL-3.0-only
import React from 'react'
import { CopyButton } from '@/components/ui/CopyButton'
import {
  detectCryptoType,
  getCryptoColorClass,
  isBitcoinAddress,
  isEthereumAddress,
  isSolanaAddress,
  isHexValue,
} from '../utils/outputFormatters'
import { PKCS11_GLOSSARY } from '@/data/glossary/pkcs11Terms'

interface OutputFormatterProps {
  output: string
  className?: string
}

// Build a single regex that matches any glossary term (escaped, word-bounded).
// Terms sorted longest-first so "HMAC-SHA3-256" wins over "SHA3-256".
const GLOSSARY_LOOKUP: Record<string, string> = PKCS11_GLOSSARY.reduce(
  (acc, t) => ({ ...acc, [t.term]: t.definition }),
  {} as Record<string, string>
)
const GLOSSARY_REGEX = new RegExp(
  '(' +
    [...PKCS11_GLOSSARY]
      .sort((a, b) => b.term.length - a.term.length)
      .map((t) => t.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|') +
    ')',
  'g'
)

/** Wrap known glossary tokens in hover chips. Whitespace is preserved exactly. */
const renderWithGlossary = (text: string): React.ReactNode => {
  if (!text) return text
  const parts = text.split(GLOSSARY_REGEX)
  if (parts.length === 1) return text
  return parts.map((part, i) => {
    const def = Object.prototype.hasOwnProperty.call(GLOSSARY_LOOKUP, part)
      ? GLOSSARY_LOOKUP[part]
      : undefined
    if (!def) return <React.Fragment key={i}>{part}</React.Fragment>
    return (
      <span key={i} title={def} className="border-b border-dotted border-primary/50 cursor-help">
        {part}
      </span>
    )
  })
}

export const OutputFormatter: React.FC<OutputFormatterProps> = ({ output, className = '' }) => {
  const lines = output.split('\n')

  const formatLine = (line: string, index: number) => {
    // Check for labeled values (e.g., "Address: 1A1zP1...")
    const labelMatch = line.match(/^([^:]+):\s*(.+)$/)

    if (labelMatch) {
      const [, label, value] = labelMatch
      const trimmedValue = value.trim()

      // Detect crypto type
      if (isBitcoinAddress(trimmedValue)) {
        return (
          <div key={index} className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
            <span className="text-muted-foreground">{label}:</span>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <code className="text-warning font-mono text-sm break-all">{trimmedValue}</code>
              <CopyButton text={trimmedValue} label="" className="shrink-0" />
            </div>
          </div>
        )
      }

      if (isEthereumAddress(trimmedValue)) {
        return (
          <div key={index} className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
            <span className="text-muted-foreground">{label}:</span>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <code className="text-primary font-mono text-sm break-all">{trimmedValue}</code>
              <CopyButton text={trimmedValue} label="" className="shrink-0" />
            </div>
          </div>
        )
      }

      if (isSolanaAddress(trimmedValue)) {
        return (
          <div key={index} className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
            <span className="text-muted-foreground">{label}:</span>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <code className="text-secondary font-mono text-sm break-all">{trimmedValue}</code>
              <CopyButton text={trimmedValue} label="" className="shrink-0" />
            </div>
          </div>
        )
      }

      if (isHexValue(trimmedValue)) {
        return (
          <div key={index} className="flex flex-col sm:flex-row sm:items-start gap-2 mb-2">
            <span className="text-muted-foreground shrink-0">{label}:</span>
            <div className="flex items-start gap-2 flex-1 min-w-0">
              <code className="text-accent font-mono text-sm break-all">{trimmedValue}</code>
              <CopyButton text={trimmedValue} label="" className="shrink-0" />
            </div>
          </div>
        )
      }

      // Regular labeled value
      return (
        <div key={index} className="mb-1">
          <span className="text-muted-foreground">{label}:</span>{' '}
          <span className="text-foreground">{renderWithGlossary(trimmedValue)}</span>
        </div>
      )
    }

    // Check for standalone crypto values or hex strings in the line
    const words = line.split(/\s+/)
    const hasCryptoValue = words.some(
      (word) =>
        isBitcoinAddress(word) ||
        isEthereumAddress(word) ||
        isSolanaAddress(word) ||
        isHexValue(word)
    )

    if (hasCryptoValue) {
      return (
        <div key={index} className="flex items-start gap-2 mb-2">
          <div className="flex-1 min-w-0">
            {words.map((word, wordIndex) => {
              const type = detectCryptoType(word)
              if (type !== 'unknown') {
                const colorClass = getCryptoColorClass(type)
                return (
                  <span key={wordIndex} className="inline-flex items-center gap-1 mr-2">
                    <code className={`${colorClass} font-mono text-sm break-all`}>{word}</code>
                    <CopyButton text={word} label="" className="shrink-0" />
                  </span>
                )
              }
              // Check if word is a long hex string (even without 0x prefix)
              if (isHexValue(word)) {
                return (
                  <span key={wordIndex} className="inline-flex items-center gap-1 mr-2">
                    <code className="text-accent font-mono text-sm break-all">{word}</code>
                    <CopyButton text={word} label="" className="shrink-0" />
                  </span>
                )
              }
              return <span key={wordIndex}>{word} </span>
            })}
          </div>
        </div>
      )
    }

    // Regular text line
    return (
      <div key={index} className="text-foreground mb-1">
        {renderWithGlossary(line)}
      </div>
    )
  }

  return (
    <div className={`space-y-1 ${className}`}>
      {lines.map((line, index) => formatLine(line, index))}
    </div>
  )
}
