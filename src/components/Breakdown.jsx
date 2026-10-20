import { useEffect, useRef, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { money } from "../lib/format.js";

// This order is deliberate, not decorative. These five colours were checked
// so that neighbouring slices stay distinguishable to colourblind readers —
// red beside green, for instance, is nearly identical under deuteranopia,
// so they're kept apart in the ring.
const COLOURS = [
  "#d9534f", // tax
  "#c8902b", // subscriptions
  "#b02a5e", // debt
  "#6a9e3c", // goals
  "#3a86c8", // free
];

function Breakdown({ gross, tax, subs, debt, goals, free }) {
  const [visible, setVisible] = useState(false);
  const boxRef = useRef(null);

  // Watches the chart and flips `visible` the first time it scrolls into
  // view. That's what triggers the spin-in animation.
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;

    // Some browsers don't have this — show the chart rather than hide it.
    if (!("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }

    const watcher = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisible(true);
          watcher.disconnect(); // animate once, not every scroll
        }
      },
      { threshold: 0.3 } // fire when 30% of it is on screen
    );

    watcher.observe(box);
    return () => watcher.disconnect();
  }, []);

  // Only include slices with something in them — a 0% slice looks broken
  const data = [
    { name: "Tax And Deductions", value: tax },
    { name: "Subscriptions", value: subs },
    { name: "Debt Payments", value: debt },
    { name: "Saving Goals", value: goals },
    { name: "Free To Spend", value: free },
  ].filter((slice) => slice.value > 0);

  const total = data.reduce((sum, slice) => sum + slice.value, 0);

  // Without a wage there's no "whole" for the parts to divide up. Showing a
  // ring of 100% subscriptions here would be worse than showing nothing.
  if (gross <= 0 || total === 0) {
    return (
      <div>
        <h3>Where Your Money Goes</h3>
        <p className="empty">Enter Your Wage Above And This Will Fill In.</p>
      </div>
    );
  }

  return (
    <div ref={boxRef}>
      <h3>Where Your Money Goes</h3>

      <div
        style={{
          // The spin-and-appear: starts small and rotated, settles into place
          opacity: visible ? 1 : 0,
          transform: visible
            ? "rotate(0deg) scale(1)"
            : "rotate(-180deg) scale(0.6)",
          transition:
            "opacity 0.8s ease, transform 1s cubic-bezier(0.25, 1, 0.3, 1)",
        }}
      >
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={68}   // the hole — this is what makes it a donut
              outerRadius={110}
              paddingAngle={2}   // small gap so slices read separately
              startAngle={90}    // begin at the top
              endAngle={-270}    // and go clockwise
              stroke="#fff"
              strokeWidth={2}
              isAnimationActive={visible}
              animationDuration={900}
            >
              {data.map((slice, index) => (
                <Cell key={slice.name} fill={COLOURS[index]} />
              ))}
            </Pie>

            <Tooltip
              formatter={(value, name) => [
                `${money(value)} A Month · ${Math.round(
                  (value / total) * 100
                )}%`,
                name,
              ]}
              contentStyle={{
                background: "#fff",
                border: "1px solid var(--hair)",
                borderRadius: 12,
                fontSize: 14,
                padding: "10px 12px",
                boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Our own legend. Every slice is named and valued here, so the chart
          never relies on colour alone to say what something is. */}
      <div style={{ marginTop: 4 }}>
        {data.map((slice, index) => (
          <div className="legend-row" key={slice.name}>
            <span
              className="legend-dot"
              style={{ background: COLOURS[index] }}
            />
            <span style={{ flex: 1 }}>{slice.name}</span>
            <span className="muted">
              {money(slice.value)} · {Math.round((slice.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Breakdown;