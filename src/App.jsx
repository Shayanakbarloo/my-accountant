import {useState} from 'react'; 

function App() {
  const [count, setRate] = useState("");
  const weekly = (Number(rate)|| 0) * 40; 

  return (
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
