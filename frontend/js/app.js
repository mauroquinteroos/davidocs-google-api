// Credentials
const CLIENT_ID = '637820051392-q98hvqkjl77plqp529g4rvb4adfva9cb.apps.googleusercontent.com'
const API_KEY = 'AIzaSyAqBieMHOdYO21DESkLNNIwadhg5z15qMk'
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"]
const SCOPE = 'https://www.googleapis.com/auth/drive'
const DEVELOPER_KEY = "AIzaSyAqBieMHOdYO21DESkLNNIwadhg5z15qMk"
const APP_ID = "637820051392"

// DOM Elements
const $btnPicker = document.querySelector('#picker-button')
const $form = document.querySelector('#form')

// Global Variables
let pickerApiLoaded = false
let oauthToken
let GoogleAuth

// File
let fileDrive

// Events
$btnPicker.addEventListener('click', () => {
  handleClientLoad()
})
$form.addEventListener('submit', async (ev) => {
  ev.preventDefault()

  const response = await fetch('http://localhost:8000/files', {
    method: 'POST',
    body: fileDrive
  })
  const data = await response.text()
  alert(data)
})

function handleClientLoad() {
  gapi.load('auth2:client', initClient)
}

function initClient() {
  gapi.client.init({
    apiKey: API_KEY,
    clientId: CLIENT_ID,
    discoveryDocs: DISCOVERY_DOCS,
    scope: SCOPE
  })
  .then(() => {
    GoogleAuth = gapi.auth2.getAuthInstance()
    oauthToken = gapi.auth.getToken().access_token

    // Listen for sig-in state changes
    GoogleAuth.isSignedIn.listen(updateSignIn2)

    // Handle the initial sign-in state
    updateSignInStatus(GoogleAuth.isSignedIn.get())
  })
  .catch((error) => {
    console.error(`Error message: ${error.message}`)
  })
}

function updateSignIn2(isSignedIn) {
  if(isSignedIn) {
    console.log('Logged In 2!')
    gapi.load('picker', isPickerLoaded)
  } else {
    console.log('Logged Out 2!')
    GoogleAuth.signIn()
  }
}

function updateSignInStatus(isSignedIn) {
  if(isSignedIn) {
    console.log('Logged In!')
    gapi.load('picker', isPickerLoaded)
  } else {
    console.log('Logged Out!')
    GoogleAuth.signIn()
  }
}

function isPickerLoaded() {
  pickerApiLoaded = true
  createPicker()
}

function createPicker() {
  if(pickerApiLoaded && oauthToken) {
    const view = new google.picker.View(google.picker.ViewId.DOCS);
    view.setMimeTypes("application/pdf");
    const picker = new google.picker.PickerBuilder()
      .enableFeature(google.picker.Feature.NAV_HIDDEN)
      .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
      .setAppId(APP_ID)
      .setOAuthToken(oauthToken)
      .addView(view)
      .addView(new google.picker.DocsUploadView())
      .setDeveloperKey(DEVELOPER_KEY)
      .setCallback(pickerCallback)
      .build();
    picker.setVisible(true);
  }
}

function pickerCallback(data) {
  const {action} = data
  if(action === google.picker.Action.PICKED) {
    const {docs: [file]} = data
    const {id, name} = file
    getFile(id, name)
  }
}

async function getFile(id, name) {
  const URL = `https://www.googleapis.com/drive/v3/files/${id}?alt=media`
  const options = {
    headers: {
      Authorization: `Bearer ${oauthToken || 'access_token'}`
    }
  }
  const response = await fetch(URL, options)
  const file = await response.blob()

  const formData = new FormData()
  formData.append('file', file, name)
  console.log(formData.get('file'))
  fileDrive = formData
}