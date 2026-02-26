import axios from "axios";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
const colordata = [
  { color: "#bcbd22" },
  { color: "#84CC16" },
  { color: "#ff7f0e" },
  { color: "#9467bd" },
  { color: "#8c564b" },
  { color: "#1f77b4" },
  { color: "#DC2626" },
  { color: "#FDBA74" },
  { color: "#e377c2" },
  { color: "#7f7f7f" },
];

export type Status = {
  name: string;
  assets: number;
  color: string;
};

const RadialGraph = () => {
  const [data, setData] = useState<Status[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);


  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get("/api/settings/status");
        const apiData = response.data.data;
        const dataWithColors = apiData.map((item: Status, index: number) => ({
          ...item,
          color: colordata[index % colordata.length].color,
        }));

        setData(dataWithColors);

      } catch (err) {
        setError("Failed to fetch data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div className="mt-12 w-full h-full flex items-center justify-center">
      <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
    </div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="flex flex-col items-center w-full h-full">

      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            innerRadius={"60%"}
            paddingAngle={5}
            outerRadius={"80%"}
            dataKey="assets"
            nameKey="name"
          >
            {data.map((item, index) => (
              <Cell key={`cell-${index}`} fill={item.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              borderRadius: "10px",
              fontSize: "14px",
              height: "35px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="w-full grid grid-cols-2">
        {data.map((item) => (
          <div key={item.name} className="flex gap-2 w-full text-sm">
            <div className="flex gap-2 items-center">
              <div
                className="rounded-full h-3 w-3"
                style={{ backgroundColor: item.color }}
              ></div>
              <span>{item.name}</span>
            </div>
            <span>({item.assets})</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RadialGraph;
