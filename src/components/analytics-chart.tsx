import { Progress } from "@/components/ui/progress";

interface AnalyticsChartProps {
  title: string;
  data: { label: string; value: number; percentage: number }[];
  colors: string[];
}

export function AnalyticsChart({ title, data, colors }: AnalyticsChartProps) {
  return (
    <div className="space-y-4">
      {title && <h3 className="text-lg font-medium">{title}</h3>}
      <div className="space-y-2">
        {data.map((item, index) => (
          <div key={index} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="font-medium">{item.label}</span>
              <span>{item.value} müşteri ({item.percentage}%)</span>
            </div>
            <Progress 
              value={item.percentage} 
              className={`h-2 ${colors[index % colors.length]}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
} 