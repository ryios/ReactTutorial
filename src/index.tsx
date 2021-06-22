//styles
import './app/scss/appStyles.scss';
//code
import '@popperjs/core';
import 'bootstrap';
import React from 'react';
import ReactDOM from 'react-dom';
import App from './app/app';

ReactDOM.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
    document.getElementById("root")
);
