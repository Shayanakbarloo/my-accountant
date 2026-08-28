import {useState} from 'react'; 

function App() { // a component. In React, a component is just a function that returns a piece of the page.
  const [count, setRate] = useState("");
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
      </label>
      <h2>${weekly} per week </h2>
    </div>
  );
}
export default App; 
