import * as Icons from "lucide-react";

export function DynamicIcon({ name, size = 18, ...props }) {
  const Icon = Icons[name] || Icons.Circle;
  return <Icon size={size} {...props} />;
}
