import { mount } from 'svelte';
import App from './App.svelte';
import './app.css';

const target = document.getElementById('app');

if (!target) throw new Error('Evolution Lab could not find its application mount.');

mount(App, { target });
