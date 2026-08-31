import {useState} from 'react'; 

function App() { // a component. In React, a component is just a function that returns a piece of the page.
  const [count, setRate] = useState(""); // This line creates a piece of memmory that react will keep track of. rate holds the current value, satRate is a function that can be used to change the value of rate. useState("") means that the initial value of rate is an empty string.
  const weekly = (Number(rate)|| 0) * 40; 

  return ( // What is returned from the function is what will be rendered to the screen.
    // The HTML-looking tags — that's JSX: HTML written inside JavaScript. It's the one weird idea in React, and you get used to it fast.
    <div>
      <h1>My Accountant</h1>
      <p>Know what you keep. Plan what's next.</p>
      <label>
        How much do you make per hour?
        <input
        type = "number"
        value = {rate}
        onChange = {(e) =>setRate(e.target.value)}
        />
        {/* the input box — onChange fires on every keystroke */}
      </label>
      {/* this recalculates itself every time rate changes */}
      <h2>${weekly} per week </h2>
    </div>
  );
}
export default App; 
