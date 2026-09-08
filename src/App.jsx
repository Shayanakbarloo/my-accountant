import {useState} from 'react'; 

function App() { // a component. In React, a component is just a function that returns a piece of the page.
  const [rate, setRate] = useState(""); // This line creates a piece of memmory that react will keep track of. rate holds the current value, satRate is a function that can be used to change the value of rate. useState("") means that the initial value of rate is an empty string.
  const [hours, setHours] = useState(""); 

  const weekly = (Number(rate)|| 0) * (Number(hours) || 0); 
  const monthly = weekly * 4; 
  const yearly = monthly * 12;  

  return ( // What is returned from the function is what will be rendered to the screen.
    // The HTML-looking tags — that's JSX: HTML written inside JavaScript. It's the one weird idea in React, and you get used to it fast.
    <div>
      <h1>My Accountant</h1>
      
      <label>
        How much do you make per hour?
        <input
        type = "number"
        value = {rate}
        onChange = {(e) =>setRate(e.target.value)}
        />
        {/* the input box — onChange fires on every keystroke */}
      </label>

      <label>
        How many hours do you work per week? 
        <input type = "number" 
        value = { hours} 
        onChange = {(e) => setHours(e.target.value)} />
      </label>

      {/* this recalculates itself every time rate changes */}
      <h2>${weekly} per week </h2>
      <h2> ${monthly} per month </h2>
      <h2> ${yearly} per year </h2>
    </div>
  );
}
export default App; 
