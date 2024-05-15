const express = require('express')
const app = express()

const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')

app.use(express.json())

const dbPath = path.join(__dirname, 'covid19India.db')

let db = null

const initializeServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })

    app.listen(3000, () => {
      console.log('server started....')
    })
  } catch (e) {
    console.log(`error occured ${e.message}`)
    process.exit(1)
  }
}

initializeServer()

const convertIntoOutput = dbObject => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  }
}

const convertIntoDistResult = dbObject => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  }
}
app.get('/states/', async (request, response) => {
  const stateQuery = `
        select * from state; 
    `

  const dbResponse = await db.all(stateQuery)
  const stateArray = dbResponse.map(eachState => convertIntoOutput(eachState))
  response.send(stateArray)
})

app.get('/states/:stateId/', async (request, response) => {
  const {stateId} = request.params

  const stateQuery = `
  select * from state where state_id = ${stateId};
  `

  const dbResponse = await db.get(stateQuery)
  const result = convertIntoOutput(dbResponse)
  response.send(result)
})

app.post('/districts/', async (request, response) => {
  const districtDetails = request.body
  const {districtName, stateId, cases, cured, active, deaths} = districtDetails

  const districtQuery = `
  insert into district (district_name , state_id , cases , cured , active , deaths) 
  values ('${districtName}' , ${stateId} , ${cases} , ${cured} , ${active} , ${deaths});
  `

  const dbResponse = await db.run(districtQuery)
  const districtId = dbResponse.lastID
  response.send('District Successfully Added')
})

app.get('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  districtQuery = `
    select * from district where district_id = ${districtId};
    `

  const dbResponse = await db.get(districtQuery)
  const result = convertIntoDistResult(dbResponse)
  response.send(result)
})

app.delete('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params

  const deleteQuery = `
  delete from district where district_id = ${districtId};
  `

  const dbResponse = await db.run(deleteQuery)
  response.send('District Removed')
})

app.put('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const districtDetails = request.body
  const {districtName, stateId, cases, cured, active, deaths} = districtDetails
  const QueryUpdate = `
  update district
  set 
    district_name = '${districtName}',
    state_id = ${stateId},
    cases = ${cases} ,
    cured = ${cured} ,
    active = ${active} , 
    deaths = ${deaths} 
  where 
    district_id = ${districtId};
  `
  await db.run(QueryUpdate)
  response.send('District Details Updated')
})

app.get('/states/:stateId/stats/', async (request, response) => {
  const {stateId} = request.params
  const getStatistics = `
  select sum(cases) as totalCases,
  sum(cured) as totalCured,
  sum(active) as totalActive,
  sum(deaths) as totalDeaths
  from district 
  where state_id = ${stateId};
  `

  const dbResponse = await db.get(getStatistics)
  response.send(dbResponse)
})

app.get('/districts/:districtId/details/', async (request, response) => {
  const {districtId} = request.params

  const queryDetails = `
  select state.state_name as stateName 
  from state inner join district 
  on state.state_id = district.state_id
  where district.district_id = ${districtId};
  `
  const dbResponse = await db.get(queryDetails)
  response.send(dbResponse)
})

module.exports = app
