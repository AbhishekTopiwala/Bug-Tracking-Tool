import React from 'react';

/**
 * SafeNotificationMessage
 * Renders a notification message securely without using dangerouslySetInnerHTML.
 * Only translates <strong>...</strong> blocks into JSX, while escaping all other
 * potential HTML tags (like <script>, <iframe>, etc.) using React's default text binding.
 */
export default function SafeNotificationMessage({ message }) {
  if (!message) return null;

  const parts = message.split(/(<\/?strong>)/);
  let isStrong = false;

  return (
    <>
      {parts.map((part, index) => {
        if (part === '<strong>') {
          isStrong = true;
          return null;
        }
        if (part === '</strong>') {
          isStrong = false;
          return null;
        }
        // React automatically escapes any tags inside `part` because it's rendered as text
        return isStrong ? (
          <strong key={index}>{part}</strong>
        ) : (
          <span key={index}>{part}</span>
        );
      })}
    </>
  );
}
