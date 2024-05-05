
// header names
const HEADERS = [
    'Keyword',
    'Rank',
    'Domain Name',
    'Domain',
    'Page Title',
    'URL'
]

// column width for table
const COL_WIDTH = [3, 1, 2, 2, 2, 2]


// create an array of all ranks of all keywords
// also get keyword count
const getAllRanks = (ranks) => {

    // collect all ranks here
    let allRanks = []

    // convert ranks array to {keyword: ranks} object
    let ranksDict = {}
    ranks.forEach(item => ranksDict[item.keyword] = item.ranks)

    // get keyword count
    const kwCount = Object.keys(ranksDict).length

    // loop over all keywords
    for (const [keyword, rankList] of Object.entries(ranksDict)) {
        // rankList contains all the ranks of one keyword
        // loop over these ranks to create an array for each rank
        const kwRanks = rankList.map(item =>
            [
                keyword,
                item.rank,
                item.domainName,
                item.domain,
                item.title,
                item.url
            ]
                .map(String)
        )
        allRanks.push(...kwRanks)
    }

    return { allRanks, kwCount }
}


// convert ranks array to csv string
const ranksToCsv = (allRanks) => {

    // loop over all ranks
    let allRows = allRanks.map(row => row
        .map(v => v.replaceAll('"', '""'))
        .map(v => `"${v}"`)
        .join(',')
    )

    // add the header row
    const headerRow = HEADERS.map(h => `"${h}"`).join(',')
    allRows.unshift(headerRow)

    // join comma separated rows by newline to form the csv string
    return allRows.join('\r\n')
}


// add csv file to download button
const addDownload = (allRanks) => {

    // get csv string from ranks array
    const csvString = ranksToCsv(allRanks)

    // create blob of csv string
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)

    // create the file name with a time string at the end
    const timeString = new Date().toTimeString().slice(0, 8).replaceAll(':', '')
    const filename = 'frog-ranks-' + timeString + '.csv'

    // attach file and filename to the download button
    const a = document.getElementById('download')
    a.href = url
    a.download = filename
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


// create a table for the ranks
const createTable = (allRanks) => {

    // create the table header HTML
    const headerString = HEADERS
        .map((h, i) => `<th class="col-${COL_WIDTH[i]}">${h}</th>`)
        .join('')

    // create the table rows HTML
    const trString = allRanks.map(item => (
        `
            <tr>
                <td>${item[0]}</td>
                <td>${item[1]}</td>
                <td>${item[2]}</td>
                <td>${item[3]}</td>
                <td>${item[4]}</td>
                <td class="url">
                    <span>${item[5].slice(0, 60)}...</span>
                    <span class="badge bg-secondary copy-btn" data-url="${item[5]}">Copy</span>
                </td>
            </tr>

        `
    )).join('')

    // create the table HTML
    const tableContainer = document.createElement('div')
    tableContainer.innerHTML = `
        <table class="table table-bordered table-hover align-middle">
            <thead>
                <tr>${headerString}</tr>
            </thead>
            <tbody>${trString}</tbody>
        </table>
    `

    // append table to document
    document.getElementById('target').appendChild(tableContainer)

    // add event listeners to all copy buttons
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', copyUrl)
    })
}


// update the summary cards
const updateSummary = (kwCount, rankCount, startTime) => {
    const kwCountNode = document.getElementById('kw-count')
    kwCountNode.innerText = kwCount
    kwCountNode.nextElementSibling.innerText = (kwCount > 1) ? 'Keywords' : 'Keyword'

    const rankCountNode = document.getElementById('rank-count')
    rankCountNode.innerText = rankCount
    rankCountNode.nextElementSibling.innerText = (rankCount > 1) ? 'Page Ranks' : 'Page Rank'

    document.getElementById('time-count').innerText = parseInt((new Date() - startTime) / 1000) + 's'
}


// copy url to clipboard when copy-btn is clicked
const copyUrl = (e) => {
    if (!navigator.clipboard) {
        alert('unable to copy')
        return
    }
    navigator.clipboard.writeText(e.target.dataset.url)
}


// main
(async () => {
    const { ranks } = await chrome.storage.local.get('ranks')
    const { startTime } = await chrome.storage.local.get('startTime')

    // get all ranks array
    const { allRanks, kwCount } = getAllRanks(ranks)

    // update the summary data
    updateSummary(kwCount, allRanks.length, startTime)

    // add csv file to download button
    addDownload(allRanks)

    setTimeout(() => {
        // create and display the ranks table
        createTable(allRanks)
    }, 500);

    await clearStorage()
})()
