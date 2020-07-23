// Credentials
const CLIENT_ID = '637820051392-q98hvqkjl77plqp529g4rvb4adfva9cb.apps.googleusercontent.com'
const API_KEY = 'AIzaSyAqBieMHOdYO21DESkLNNIwadhg5z15qMk'
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"]
const SCOPE = 'https://www.googleapis.com/auth/drive'
const DEVELOPER_KEY = "AIzaSyAqBieMHOdYO21DESkLNNIwadhg5z15qMk"
const APP_ID = "637820051392"

// DOM Elements
const $btnPicker = document.querySelector('#picker-button')
const $btnSelect = document.querySelector('#select-button')
const $inputFile = document.querySelector('#get-file')
const $btnUpload = document.querySelector('#upload-button')
const $btnSend = document.querySelector('#send-button')
const $form = document.querySelector('#form')

// Global Variables
let pickerApiLoaded = false
let driveApiLoaded = false
let oauthToken
let GoogleAuth
let driveFile
let localFile
let driveFolder

// Events
$btnPicker.addEventListener('click', () => {
  $btnSend.classList.add('opacity-50', 'cursor-not-allowed')
  $btnSend.setAttribute('disabled', '')
  handleClientLoadForPicker()
})
$form.addEventListener('submit', async (ev) => {
  ev.preventDefault()
  try {
    const response = await fetch('http://localhost:8000/files', {
      method: 'POST',
      body: driveFile
    })
    const data = await response.text()
    alert(data)
  } catch(error) {
    alert(`Error: ${error.message}`)
  }
})
$btnSelect.addEventListener('click', () => {
  $inputFile.click()
  $btnUpload.classList.add('opacity-50', 'cursor-not-allowed')
  $btnUpload.setAttribute('disabled', '')
})
$inputFile.addEventListener('change', (ev) => {
  const $parentElement = ev.target.parentNode
  localFile = $inputFile.files.item(0)
  const $infoElement = document.createElement('p')
  console.log(localFile)
  $infoElement.innerText = localFile.name
  $infoElement.classList.add('text-gray-600', 'mt-2', 'mb-4', 'file-name')
  $parentElement.insertBefore($infoElement, $inputFile)
  $btnUpload.classList.remove('opacity-50', 'cursor-not-allowed')
  $btnUpload.removeAttribute('disabled')
})
$btnUpload.addEventListener('click', () => {
  if(localFile) {
    // Enviar a google drive
    // createFolder('DaviDocs')
    uploadFile('DaviDocs')
    document.querySelector('.file-name').remove()
  } else {
    alert('Primero Seleccione un archivo')
  }
})

function getFolder(nameFolder) {
  return gapi.client.drive.files.list({
    fields: "nextPageToken, files(id, name, mimeType)",
    pageSize: 10,
    q: `mimeType='application/vnd.google-apps.folder' and name contains '${nameFolder}'`
  })
  .then((response) => {
    const {result: {files: [file]}, result: {files}} = response
    const folder = files.length === 0 ? null : file
    return folder
  })
}

function createFolder(name) {
  const fileMetadata = {
    name: name,
    mimeType: 'application/vnd.google-apps.folder'
  }
  return gapi.client.drive.files.create({
    resource: fileMetadata,
    fields: '*'
  })
  .then((file) => {
    return file
  })
}

async function uploadFile(name) {
  // verificar si el folder existe
  const folder = await getFolder(name)

  if(folder) {
    createFile(folder.id, localFile.name, localFile.type)
  } else {
    const newFolder = await createFolder(name)
    console.log(newFolder)
  }
}

function createFile(folderId, fileName, fileMimeType) {
  const fileMetadata = {
    name: fileName,
    mimeType: fileMimeType,
    parents: [folderId],
  }
  const formData = new FormData()
  formData.append('metadata', new Blob([JSON.stringify(fileMetadata)], {type: 'application/json'}))
  formData.append('file', localFile)

  const URL = `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=*`
  fetch(URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${oauthToken || 'access_token'}`
    },
    body: formData
  })
  .then((resp) => {
    return resp.json()
  })
  .then(data => console.log(data))
}

function handleClientLoadForPicker() {
  gapi.load('auth2:client', initClientForPicker)
}

function initClientForPicker() {
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
    GoogleAuth.isSignedIn.listen(updateSignInStatusForPicker)

    // Handle the initial sign-in state
    updateSignInStatusForPicker(GoogleAuth.isSignedIn.get())
  })
  .catch((error) => {
    console.error(`Error message: ${error.message}`)
  })
}

function updateSignInStatusForPicker(isSignedIn) {
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
    console.log(data)
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

  console.log(file)
  const formData = new FormData()
  formData.append('file', file, name)
  driveFile = formData
  $btnSend.removeAttribute('disabled')
  $btnSend.classList.remove('opacity-50', 'cursor-not-allowed')
}