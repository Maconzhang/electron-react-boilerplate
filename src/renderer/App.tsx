import { useEffect, useState } from 'react';
import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import icon from '../../assets/icon.svg';
import './App.css';
import moment from 'moment';

const Hello = () => {
  console.log('window.a =', window.a);

  setTimeout(() => {
    console.log('setTime out window.a', window.a);
  }, 3000);

  const [testState, setTestStatte] = useState(1);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    console.log('window.electronAPI', window.electron);
    window.x = (num) => {
      console.log('num', num);
      setTestStatte(2);
    };

    window.electron.onSocketMessage((event, value) => {
      console.log('onSocketMessage', value);
      const { e: message } = value;
      const time = logs.push(
        `[${moment().format('yyyy-MM-DD HH:mm:ss')}] -- ${message.mode} -- ${
          message?.url
        }`
      );
      setLogs([...logs]);
    });

    window.electron.onSocketMessages((event, value) => {
      console.log('onSocketMessage', value);

      const list = value.map((i) => {
        const { e: message, log } = i;
        return log;
      });

      console.log('list', list);

      // const time = logs.push(
      //   `[${moment().format('yyyy-MM-DD HH:mm:ss')}] -- ${message.mode} -- ${
      //     message?.url
      //   }`
      // );
      setLogs([...logs, ...list]);
    });
  }, []);

  return (
    <div>
      <div className="Hello">
        <img width="200" alt="icon" src={icon} />
      </div>
      <h1>淘菜菜打印助手</h1>
      <div className="logs">
        {logs.reverse().map((text, index) => {
          return <div key={index}>{text}</div>;
        })}
      </div>
    </div>
  );
};

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Hello />} />
      </Routes>
    </Router>
  );
}
