
// global var to store keywords on file/input change
let keywordsFile = []
let keywordsInput = []


// split text to lines using delimiter
const getLines = (text, separator) => {
    if (separator == 'newline') {
        return text.replace(/(\r\n)|\r|\n/g, '\n').split(/\n+/g).map(line => line.trim())
    }
    if (separator == 'comma') {
        return text.split(',').map(line => line.trim()).filter(line => line != '')
    }
    throw Error('Invalid text and/or separator.')
}


// read keywords from file input
const getKeywordsFromFile = () => {

    const file = document.getElementById('file').files[0]
    if (!file) throw Error('No file selected.')

    const name = file.name
    const ext = name.slice(name.lastIndexOf('.')).toLowerCase()
    if (ext != '.txt') throw Error('File must be a text file with .txt extension.')

    const reader = new FileReader()
    reader.readAsText(file)

    reader.onload = () => {
        const separator = document.querySelector("input[type='radio'][name=separator]:checked").value
        const text = reader.result.trim()
        keywordsFile = getLines(text, separator)
    }

    reader.onerror = () => {
        throw Error(reader.error)
    }
}


// read keywords from text input
const getKeywordsFromInput = () => {
    const text = document.getElementById('text').value
    keywordsInput = getLines(text, 'comma')
}


// get the keywords from the input of the open tab
const getKeywords = () => {
    const tab = document.querySelector('#kw-tab .nav-link.active').id
    if (tab == 'file-tab') return keywordsFile
    if (tab == 'input-tab') return keywordsInput
}


// clear the extension storage
const clearStorage = async () => {
    await chrome.storage.local.set({ ranks: [] })
    await chrome.storage.local.set({ keywords: [] })
    await chrome.storage.local.set({ command: 'sleep' })
    await chrome.storage.local.set({ target: 10 })
    await chrome.storage.local.set({ domains: [] })
    await chrome.storage.local.set({ startTime: 0 })
}


// get the target input value
const getTarget = () => parseInt(document.getElementById('target').value)


// get the domains list from domain input
const getDomains = () => {
    const domainVal = document.getElementById('domain').value
    const domains = getLines(domainVal, 'comma')
    return domains
}


// run on click of the start button
const start = async () => {

    // get the alert box node
    const alertBox = document.getElementById('error')

    try {

        // hide alert and clear storage
        alertBox.classList.add('hide')
        await clearStorage()

        // get all inputs
        const keywords = getKeywords()
        if (keywords.length == 0) throw Error('No keywords found.')
        const target = getTarget()
        const domains = getDomains()

        // update the store by the input values
        await chrome.storage.local.set({ keywords })
        await chrome.storage.local.set({ command: 'start' })
        await chrome.storage.local.set({ target })
        await chrome.storage.local.set({ domains })
        await chrome.storage.local.set({ startTime: Date.now() })

        // go to the google homepage to start the process
        chrome.tabs.create({ url: 'https://www.google.com/' })

    } catch (error) {

        // add the error message to the alert box and show it
        alertBox.innerText = error.message
        alertBox.classList.remove('hide')
    }
}

// add the event listeners
document.getElementById('file').addEventListener('change', getKeywordsFromFile)
document.getElementById('text').addEventListener('change', getKeywordsFromInput)
document.getElementById('start').addEventListener('click', start)
document.getElementById('reset').addEventListener('click', async () => await clearStorage())