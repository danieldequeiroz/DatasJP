const express = require('express');
const app = express();
const moment = require('moment');
const cors = require('cors');
const fs = require('fs');

app.use(express.json());
app.use(express.static('public'));
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  headers: ['Content-Type', 'Authorization']
}));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});

let feriados;
let feriadosfixos;
let feriadosnaofixos;

// Carrega os dados dos feriados
const feriadosJson = fs.readFileSync('./api/feriados.json', 'utf8');
feriados = JSON.parse(feriadosJson);

const feriadosfixosJson = fs.readFileSync('./api/feriadosfixos.json', 'utf8');
feriadosfixos = JSON.parse(feriadosfixosJson);

const feriadosnaofixosJson = fs.readFileSync('./api/feriadosnaofixos.json', 'utf8');
feriadosnaofixos = JSON.parse(feriadosnaofixosJson);

// Função que verifica se um determinado dia é feriado
function isHoliday(day, holidays) {
  return holidays.some(holiday => holiday.date === day.format('YYYY-MM-DD')) || isHolidayInFeriadosFixos(day);
}

function isHolidayInFeriadosFixos(day) {
  return feriadosfixos.some(feriado => feriado.date === day.format('YYYY-MM-DD'));
}

function isHolidayInFeriadosNaofixos(day) {
  return feriadosnaofixos.some(feriado => feriado.date === day.format('YYYY-MM-DD'));
}

// API para calcular dias úteis entre duas datas
app.get('/api/dias-uteis', (req, res) => {
  if (!req.query.dataInicial || (!req.query.dataFinal && !req.query.quantDiasUteis)) {
    res.status(400).json({ error: 'Parâmetros inválidos' });
  } else if (req.query.dataInicial && req.query.dataFinal) {
    const startDate = moment(req.query.dataInicial, 'YYYY-MM-DD');
    const endDate = moment(req.query.dataFinal, 'YYYY-MM-DD');
    if (!startDate.isValid() || !endDate.isValid()) {
      res.status(400).json({ error: 'Data inválida' });
    } else {
      let totalDays = 0;
      for (let day = startDate; day <= endDate; day.add(1, 'days')) {
        if (day.isoWeekday() !== 6 && day.isoWeekday() !== 7 && !isHoliday(day, feriados)) {
          totalDays++;
        }
      }
      res.json({ diasUteis: totalDays });
    }
  } else if (req.query.dataInicial && req.query.quantDiasUteis) {
    const startDate = moment(req.query.dataInicial, 'YYYY-MM-DD');
    if (!startDate.isValid()) {
      res.status(400).json({ error: 'Data inválida' });
    } else {
      const quantDiasUteis = parseInt(req.query.quantDiasUteis);
      if (isNaN(quantDiasUteis) || quantDiasUteis <= 0) {
        res.status(400).json({ error: 'Quantidade de dias úteis inválida' });
      } else {
        let endDate = startDate.clone();
        for (let i = 0; i < quantDiasUteis; i++) {
          endDate.add(1, 'days');
          while (endDate.isoWeekday() === 6 || endDate.isoWeekday() === 7 || isHoliday(endDate, feriados)) {
            endDate.add(1, 'days');
          }
        }
        res.json({ dataFinal: endDate.format('YYYY-MM-DD') });
      }
    }
  } else {
    res.json(feriados);
  }
});

// API para retornar a lista de feriados fixos
app.get('/api/feriadosfixos', (req, res) => {
  res.json(feriadosfixos);
});

// API para retornar a lista de feriados não fixos
app.get('/api/feriadosnaofixos', (req, res) => {
  res.json(feriadosnaofixos);
});

// API para adicionar um novo feriado
app.post('novo-feriado', (req, res) => {
  try {
    const { date, nome, type, fixed } = req.body;

    if (!date || !nome || !type || !fixed) {
      throw new Error('Parâmetros inválidos');
    }

    const momentDate = moment(date, 'YYYY-MM-DD');
    if (!momentDate.isValid()) {
      throw new Error('Data inválida');
    }

    const validTypes = ['feriado nacional', 'feriado estadual', 'feriado municipal', 'ponto facultativo'];
    if (!validTypes.includes(type)) {
      throw new Error('Tipo de feriado inválido');
    }

    if (fixed === 'non-fixed') {
      feriadosnaofixos.push({ date, nome, type });
      fs.writeFileSync('./api/feriadosnaofixos.json', JSON.stringify(feriadosnaofixos, null, 2));
    } else {
      feriadosfixos.push({ date, nome, type });
      fs.writeFileSync('./api/feriadosfixos.json', JSON.stringify(feriadosfixos, null, 2));
    }

    feriados.push({ date, nome, type });
    res.json({ message: 'Feriado adicionado com sucesso!' });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'Erro ao adicionar feriado' });
  }
});

// Rota principal que retorna uma mensagem de boas-vindas
app.get('/api', (req, res) => {
  res.send('Bem-vindo ao Servidor API DATAS');
});

module.exports = app;
