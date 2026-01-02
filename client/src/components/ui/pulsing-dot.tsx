export function PulsingDot({ color = "green" }: { color?: "green" | "orange" | "blue" }) {
  const colorClasses = {
    green: "bg-green-500",
    orange: "bg-orange-500",
    blue: "bg-blue-500"
  };
  
  return (
    <span className="relative flex h-2 w-2">
      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${colorClasses[color]} opacity-75`}></span>
      <span className={`relative inline-flex rounded-full h-2 w-2 ${colorClasses[color]}`}></span>
    </span>
  );
}
