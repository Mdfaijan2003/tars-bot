export function formatMessageTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();

  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  const time = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  if (sameDay) return time;

  const sameYear = date.getFullYear() === now.getFullYear();
  const datePart = date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" })
  });

  return `${datePart}, ${time}`;
}
