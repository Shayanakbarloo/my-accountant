import {useState} from 'react'; 

function money (amount){ 
  return "$" + Math.round(amount). toLocaleString("en-US"); 
}

function App() { // a component. In React, a component is just a function that returns a piece of the page.
  const [rate, setRate] = useState(""); // This line creates a piece of memmory that react will keep track of. rate holds the current value, satRate is a function that can be used to change the value of rate. useState("") means that the initial value of rate is an empty string.
  const [hours, setHours] = useState(""); 
  const [subs, setSubs] = useState([
    { name: "Netflix", cost: 17 },
    { name: "Spotify", cost: 11 },
  ]);
  const [newName, setNewName] = useState(""); 
  const [newCost, setNewCost] = useState(""); 

  const weekly = (Number(rate)|| 0) * (Number(hours) || 0); 
  const monthly = weekly * 4; 

// reduce is a function that takes an array and reduces it to a single value. In this case we are reducing the array of subscriptions to a single value
  const subsTotal = subs.reduce((total, sub) => total + sub.cost, 0); 
  const leftover = weekly - subsTotal; 


  function addSub(){
    if (!newName || !newCost) return; // ignore empty submissions

// a NEW array: everything already in subs, plus the new one
  setSubs([...subs, { name: newName, cost: Number (newCost) }]); 

  setNewName(""); 
  setNewCost(""); 
  }

  function removeSub(indexToRemove){ // keep every item except the one at that position
    setSubs(subs.filter((sub, index) => index !== indexToRemove));
  }

  return ( // What is returned from the function is what will be rendered to the screen.
    // The HTML-looking tags — that's JSX: HTML written inside JavaScript. It's the one weird idea in React, and you get used to it fast.

    <div>
      <h1>My Accountant</h1>
      
      <label>
        How much do you make per hour?
        <input
        type = "number" value = {rate} onChange = {(e) => setRate(e.target.value)} />
        {/* the input box — onChange fires on every keystroke */}
      </label>

      <label>
        How many hours do you work per week? 
        <input type = "number" value = {hours} onChange = {(e) => setHours(e.target.value)} />
      </label>

      <h2> {money(monthly)} per month </h2>

      <h3> Subscriptions </h3>
      <ul> 
        {subs.map((sub, index) => (
          <li key = {index} >
            {sub.name} - {money(sub.cost)} 
          </li>
        ))}
      </ul>
      {/* this recalculates itself every time rate changes */}
      <h2>{money(weekly)} per week </h2>

      <h2>{money(subsTotal)} a month on subscriptions</h2>
      <h2>{money(leftover)} left over</h2>
    </div>
  );
}
export default App; 
