import {useState} from 'react';
import {money} from '../lib/format.js';

function Goals({goals,freeMonthly, onAdd, onRemove}){
    const [title, setTitle] = useState('');
    const [cost, setCost] = useState(''); 
    const [date, setDate] = useState('');
}
function handleAdd(){
    if(!title || !cost || !date) return; 
    onAdd({title, cost: Number(cost), date}); 
    setTitle('');
    setCost('');
    setDate('');
}

function planFor(goal){
     const msLeft = new Date(goal.date) - new Date();
     const daysLeft = Math.ceil(msLeft / 86400000); // ms in a day
     if (daysLeft <= 0) {
        return { overdue: true };
     }
     const perMonth = goal.cost / (daysLeft / 30.44);
     const share = freeMonthly > 0 ? (perMonth / freeMonthly) * 100 : 999;
     return {overdue:false, perMonth, share}; 
}

return (
    <div>
      <h3>Saving goals</h3>

      {goals.length === 0 && (
        <p style={{ color: "var(--sub)" }}>Nothing planned yet.</p>
      )}

      {goals.map((goal) => {
        const plan = planFor(goal);

        return (
          <div className="sub-row" key={goal.id}>
            <div>
              <strong>{goal.title}</strong>
              <div style={{ fontSize: 13, color: "var(--sub)" }}>
                {money(goal.cost)} by {goal.date}
              </div>
              {plan.overdue ? (
                <div style={{ fontSize: 13, color: "var(--red)" }}>
                  That date has passed.
                </div>
              ) : (
                   <div style={{ fontSize: 13, color: plan.share > 100 ? "var(--red)" : "var(--green)" }}>
                  {money(plan.perMonth)} a month — {Math.round(plan.share)}% of what's spare
                </div>
              )}
               </div>
            <button className="remove" onClick={() => onRemove(goal.id)}>Remove</button>
          </div>
        );
      })}
      <div className="add-row">
        <input placeholder = "New laptop" value = {title} onChange = {(e) => setTitle(e.target.value)} />
        <input type = "number" placeholder="Cost" value={cost} onChange={(e) => setCost(e.target.value)} />
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <button onClick={handleAdd}>Add</button>
      </div>
    </div>
  );

export default Goals;