import { useEffect, useRef, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Sector,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
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

// Drawn in place of the normal slice while the mouse is over it.
// Same slice, just pushed outward and given a thin trailing ring —
// enough to feel like it lifted off the page.
function ActiveSlice(props) {
  const {
    cx, cy, innerRadius, outerRadius,
    startAngle, endAngle, fill,
  } = props;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 9}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        stroke="#fff"
        strokeWidth={2}
      />
      {/* a faint echo just outside it, like a shadow being cast */}
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={outerRadius + 12}
        outerRadius={outerRadius + 15}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.35}
      />
    </g>
  );
}

function Breakdown({ gross, tax, subs, debt, goals, free }) {
  const [visible, setVisible] = useState(false);
  const [activeIndex, setActiveIndex] = useState(null);
  const boxRef = useRef(null);

  // Watches the chart and flips `visible` the first time it scrolls into
  // view. That's what starts the whole entrance.
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
      // Fire a little before it's fully on screen, so the movement has
      // finished by the time it's centred. Apple's pages do the same.
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" }
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

  const active = activeIndex === null ? null : data[activeIndex];

  return (
    <div ref={boxRef}>
      <h3>Where Your Money Goes</h3>

      <div style={{ position: "relative" }}>
        <div
          style={{
            // The entrance: rises, fades in, and unwinds a quarter turn.
            opacity: visible ? 1 : 0,
            transform: visible
              ? "translateY(0) rotate(0deg) scale(1)"
              : "translateY(28px) rotate(-90deg) scale(0.82)",
            // Apple's house easing — quick to start, long slow landing.
            transition:
              "opacity 0.7s cubic-bezier(0.28, 0.11, 0.32, 1), " +
              "transform 1.1s cubic-bezier(0.28, 0.11, 0.32, 1)",
          }}
        >
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={68}   // the hole — this is what makes it a donut
                outerRadius={104}
                paddingAngle={2}   // small gap so slices read separately
                startAngle={90}    // begin at the top
                endAngle={-270}    // and go clockwise
                stroke="#fff"
                strokeWidth={2}
                // These three lines are the hover behaviour: Recharts swaps in
                // ActiveSlice for whichever index is active.
                activeIndex={activeIndex ?? undefined}
                activeShape={ActiveSlice}
                onMouseEnter={(_, index) => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
                isAnimationActive={visible}
                animationDuration={1000}
                animationEasing="ease-out"
              >
                {data.map((slice, index) => (
                  <Cell
                    key={slice.name}
                    fill={COLOURS[index]}
                    style={{
                      // Everything that isn't hovered steps back slightly
                      opacity:
                        activeIndex === null || activeIndex === index ? 1 : 0.45,
                      transition: "opacity 0.3s ease",
                      cursor: "pointer",
                    }}
                  />
                ))}
              </Pie>

              <Tooltip
                // Follows the cursor rather than snapping to the slice centre
                animationDuration={200}
                formatter={(value, name) => [
                  `${money(value)} A Month · ${Math.round(
                    (value / total) * 100
                  )}%`,
                  name,
                ]}
                contentStyle={{
                  background: "rgba(255,255,255,0.96)",
                  backdropFilter: "saturate(180%) blur(12px)",
                  border: "1px solid var(--hair)",
                  borderRadius: 12,
                  fontSize: 14,
                  padding: "10px 12px",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.14)",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Sits in the hole. Shows the total normally, and whatever you're
            pointing at while you point at it. pointerEvents none so it
            never blocks the slices underneath. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            pointerEvents: "none",
            textAlign: "center",
            opacity: visible ? 1 : 0,
            transition: "opacity 0.9s ease 0.3s",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 13,
                color: "var(--sub)",
                transition: "color 0.25s ease",
              }}
            >
              {active ? active.name : "A Month"}
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 600,
                letterSpacing: "-0.02em",
                fontVariantNumeric: "tabular-nums",
                color: active ? COLOURS[activeIndex] : "var(--ink)",
                transition: "color 0.25s ease",
              }}
            >
              {active
                ? `${Math.round((active.value / total) * 100)}%`
                : money(total)}
            </div>
          </div>
        </div>
      </div>

      {/* Our own legend. Every slice is named and valued here, so the chart
          never relies on colour alone to say what something is. Hovering a
          row lights up its slice, which also gives touch users a way in. */}
      <div style={{ marginTop: 4 }}>
        {data.map((slice, index) => (
          <div
            className="legend-row"
            key={slice.name}
            onMouseEnter={() => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
            style={{
              cursor: "pointer",
              // Each row arrives just after the one above it
              opacity: visible ? 1 : 0,
              transform: visible ? "translateX(0)" : "translateX(-12px)",
              transition: `opacity 0.5s ease ${0.45 + index * 0.09}s, transform 0.5s ease ${
                0.45 + index * 0.09
              }s`,
            }}
          >
            <span
              className="legend-dot"
              style={{
                background: COLOURS[index],
                transform: activeIndex === index ? "scale(1.45)" : "scale(1)",
                transition: "transform 0.25s cubic-bezier(0.34, 1.6, 0.64, 1)",
              }}
            />
            <span
              style={{
                flex: 1,
                fontWeight: activeIndex === index ? 600 : 400,
                transition: "font-weight 0.2s ease",
              }}
            >
              {slice.name}
            </span>
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