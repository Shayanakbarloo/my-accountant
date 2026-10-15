import {useState} from 'react';
import {money} from '../lib/format.js';

function Debt({debts, freeMonthly, onAdd, onRemove}){
    const [name, setName] = useState(''); 
    const [balance, setBalance] = useState('');
    const [rate, setRate] = useState(''); 
    const [date, setDate] = useState('');

    function handleAdd(){
        if(!name || !balance) return;
        onAdd({name, 
            balance: Number(balance),
            rate: Number(rate)|| 0,
            date: date || null,
        });
    
        setName('');
        setBalance('');
        setRate('');
        setDate('');
    }
    
    function freeMonthlyFor(debt){
        const monthlyInterest = (debt.balance * debt.rate) / 100 / 12; 
        const share = freeMonthly > 0 ? (monthlyInterest / freeMonthly) * 100 : 999; 
        return {monthlyInterest, share}; 
    }
}