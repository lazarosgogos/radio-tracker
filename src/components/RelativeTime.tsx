"use client";

import { useEffect, useState } from "react";
import { formatRelative } from "@/lib/time";

type RelativeTimeProps = {
  value: Date | string;
};

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function getRefreshDelay(value: Date | string, now: number) {
  const date = typeof value === "string" ? new Date(value) : value;
  const elapsed = Math.max(0, now - date.getTime());

  if (elapsed < MINUTE) return SECOND - (elapsed % SECOND);
  if (elapsed < HOUR) return MINUTE - (elapsed % MINUTE);
  if (elapsed < DAY) return HOUR - (elapsed % HOUR);
  return DAY - (elapsed % DAY);
}

export function RelativeTime({ value }: RelativeTimeProps) {
  const [now, setNow] = useState(() => Date.now());
  const date = typeof value === "string" ? new Date(value) : value;

  useEffect(() => {
    setNow(Date.now());
  }, [value]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setNow(Date.now());
    }, getRefreshDelay(value, now));

    return () => {
      window.clearTimeout(timeout);
    };
  }, [now, value]);

  return (
    <time dateTime={date.toISOString()} suppressHydrationWarning>
      {formatRelative(value, now)}
    </time>
  );
}
