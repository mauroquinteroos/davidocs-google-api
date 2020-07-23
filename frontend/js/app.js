// Credentials
const CLIENT_ID = '637820051392-q98hvqkjl77plqp529g4rvb4adfva9cb.apps.googleusercontent.com'
const API_KEY = 'AIzaSyAqBieMHOdYO21DESkLNNIwadhg5z15qMk'
const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest']
const SCOPE = 'https://www.googleapis.com/auth/drive'
const DEVELOPER_KEY = 'AIzaSyAqBieMHOdYO21DESkLNNIwadhg5z15qMk'
const APP_ID = '637820051392'

// DOM Elements
const $btnPicker = document.querySelector('#picker-button')
const $btnSelect = document.querySelector('#select-button')
const $inputFile = document.querySelector('#select-input')
const $btnUpload = document.querySelector('#upload-button')
const $btnSend = document.querySelector('#send-button')
const $form = document.querySelector('#form')

// Google Variables
let GoogleAuth
let driveFormData
let localFile

// Initial function to load Google APIs
handleClientLoad()

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
  })
  .catch((error) => console.error(`Error to init APIs: ${error.message}`))
}

// DOM Main Events
$btnPicker.addEventListener('click', () => {
  updateSignInStatus(GoogleAuth.isSignedIn.get(), uploadPicker)
})
$btnUpload.addEventListener('click', () => {
  updateSignInStatus(GoogleAuth.isSignedIn.get(), validateLoad)
})

function updateSignInStatus(isSignedIn, callToAction) {
  if(isSignedIn) {
    console.log('Logged In')
    callToAction()
  } else {
    console.log('Logged Out')
    GoogleAuth.signIn()
    .then(() => {
      console.log('I just logged in')
      callToAction()
    })
    .catch((error) => {
      console.error(`Error to signIn: ${error.message}`)
    })
  }
}

// Get a file from google drive
function uploadPicker() {
  disabledButton($btnSend, ['opacity-50', 'cursor-not-allowed'], {
    attribute: 'disabled',
    value: ''
  })
  gapi.load('picker', createPicker)
}
function createPicker() {
  if(gapi.auth.getToken().access_token) {
    const view = new google.picker.View(google.picker.ViewId.DOCS);
    view.setMimeTypes("application/pdf, application/vnd.google-apps.folder");
    const picker = new google.picker.PickerBuilder()
    .enableFeature(google.picker.Feature.NAV_HIDDEN)
      .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
      .setAppId(APP_ID)
      .setOAuthToken(gapi.auth.getToken().access_token)
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
  if (action === google.picker.Action.PICKED) {
    const {docs: [file]} = data
    const {id, name} = file
    getFile(id, name)
  } else if (action === google.picker.Action.CANCEL) {
    enabledButton($btnSend, ['opacity-50', 'cursor-not-allowed'], {attribute: 'disabled'})
  }
}
async function getFile(id, name) {
  try {
    const URL = `https://www.googleapis.com/drive/v3/files/${id}?alt=media`
    const accessToken = gapi.auth.getToken().access_token
    const options = {
      headers: {
        'Authorization': `Bearer ${accessToken || 'access_token'}`
      }
    }
    const response = await fetch(URL, options)
    const file = await response.blob()
    const formData = new FormData()
    formData.append('file', file, name)
    driveFormData = formData
    enabledButton($btnSend, ['opacity-50', 'cursor-not-allowed'], {attribute: 'disabled'})
  } catch (error) {
    console.error(`Error to fetch a file: ${error.message}`)
  }
}

// Upload a file to google drive
function validateLoad() {
  if(localFile) {
    uploadFile()
  } else {
    alert('Primero Seleccione un archivo')
  }
}
async function uploadFile() {
  try {
    const folderName = 'DaviDocs'
    const folder = await getFolder(folderName)
    if(folder) {
      await loadToDrive(folder, localFile)
    } else {
      const newFolder = await createFolder(folderName)
      await loadToDrive(newFolder, localFile)
    }
    document.querySelector('#file-name').remove()
    alert('Archivo Subido')
  } catch (error) {
    console.error(`Error to create or get a folder ${error.message}`)
  }
}
function getFolder(name) {
  return gapi.client.drive.files.list({
    fields: 'nextPageToken, files',
    q: `mimeType='application/vnd.google-apps.folder' and name contains '${name}'`
  })
  .then((response) => {
    const {result: {files: [file]}, result: {files}} = response
    const folder = files.length === 0 ? null : file
    return folder
  })
}
function createFolder(name) {
  const metadata = {
    name: name,
    mimeType: 'application/vnd.google-apps.folder'
  }
  return gapi.client.drive.files.create({
    resource: metadata,
    fields: '*'
  })
  .then((response) => {
    const {result} = response
    return result
  })
}
async function loadToDrive({id}, {name, type}) {
  try {
    const metadata = {
      name: name,
      mimeType: type,
      parents: [id]
    }
    const formData = new FormData()
    formData.append('metadata', new Blob([JSON.stringify(metadata)], {type: 'application/json'}))
    formData.append('file', localFile)

    const URL = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=*'
    const accessToken = gapi.auth.getToken().access_token
    const options = {
      method: 'POST',
      'headers': {
        'Authorization': `Bearer ${accessToken || 'access_token'}`
      },
      body: formData
    }
    const response = await fetch(URL, options)
    const file = await response.json()
    return file
  } catch (error) {
    console.error(`Error to upload a file to google drive: ${error.message}`)
  }
}

// DOM Testing Events
$form.addEventListener('submit', async (ev) => {
  ev.preventDefault()
  try {
    const response = await fetch('http://localhost:8000/files', {
      method: 'POST',
      body: driveFormData
    })
    const data = await response.text()
    alert(data)
  } catch (error) {
    console.error(`Error to fetch a file: ${error.message}`)
  }
})
$btnSelect.addEventListener('click', (ev) => {
  disabledButton($btnUpload, ['opacity-50', 'cursor-not-allowed'], {
    attribute: 'disabled',
    value: ''
  })
  $inputFile.click()
})
$inputFile.addEventListener('change', (ev) => {
  const {target: {parentNode}} = ev
  localFile = $inputFile.files.item(0)
  createInfoElement(parentNode, $inputFile, localFile.name, 'file-name')
  enabledButton($btnUpload, ['opacity-50', 'cursor-not-allowed'], {attribute: 'disabled'})
})

// Manipulating the DOM
function disabledButton(btnElement, styles, {attribute, value}) {
  btnElement.classList.add(...styles)
  btnElement.setAttribute(attribute, value)
}
function enabledButton(btnElement, styles, {attribute}) {
  btnElement.classList.remove(...styles)
  btnElement.removeAttribute(attribute)
}
function createInfoElement(parentElement, siblingElement, info, id) {
  const infoElement = document.createElement('p')
  infoElement.innerText = info
  infoElement.id = id
  infoElement.classList.add('text-gray-600', 'mt-2', 'mb-4')
  parentElement.insertBefore(infoElement, siblingElement)
}