
// google search url
const getUrl = (kw) => 'https://www.google.com/search?q=' + encodeURI(kw).replaceAll('%20', '+')


// regex to find the domain from url
const REGEX_DOMAIN = /\b([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}\b/gm


// heading of google results to exclude
const googleHeadings = [
    'more questions',
    'other searches',
    'videos',
    'additional searches',
    'related questions'
]


// add a modal to the page
const addModal = (length) => {
    let textItems = `
        <h3 class="frog-animate-character">Collecting ranks, do not exit...</h3>
    `
    if (length) textItems = `
        ${textItems}
        <h4>Keywords left: ${length}</h4>
    `
    // if captcha page, add remove modal button
    if (window.location.href.includes('www.google.com/sorry/index')) textItems = `
        ${textItems}
        <button id="frog-solve">Solve Captcha</button>
    `
    const modal = document.createElement('div')
    modal.innerHTML = `
        <div class="frog-modal">
            <div class="frog-modal-body">
                <div class="frog-pacman">
                    <div class="loadingio-spinner-bean-eater">
                        <div class="ldio">
                            <div>
                                <div></div>
                                <div></div>
                                <div></div>
                            </div>
                            <div>
                                <div></div>
                                <div></div>
                                <div></div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="frog-text-container">
                    ${textItems}
                </div>
            </div>
        </div>
    `
    document.body.appendChild(modal)

    // add click listener to remove modal button
    const btn = document.getElementById('frog-solve')
    if (btn) btn.addEventListener('click', removeModal)
}


// remove modal
const removeModal = () => {
    const modal = document.querySelector('.frog-modal')
    if (modal) modal.remove()
}


// scroll to get target number of results
const scrollToLoadMore = async (target) => {
    await new Promise((resolve) => {
        let previousScrollY = 0
        let retries = 3
        const timer = setInterval(() => {
            window.scrollBy(0, window.innerHeight)
            const currentScrollY = parseInt(window.scrollY)
            // no new element but retries left
            if (previousScrollY >= currentScrollY && retries != 0) {
                retries--
                return
            }
            // no new element and no retries left
            if (previousScrollY >= currentScrollY && retries == 0) {
                stopScrolling()
                resolve()
            }
            // new elements present
            previousScrollY = currentScrollY
            const searchResults = getSearchResults()
            if (searchResults.length >= target) {
                stopScrolling()
                resolve()
            }
        }, 500)
        const stopScrolling = () => clearInterval(timer)
    })
}


// get heading text from heading node
const getHeadingText = (heading) => heading.innerText.toLowerCase().trim()


// check if google result is a section by google
const isHitNonGoogle = (hit) => {
    const heading = hit.querySelector('div[role=heading]')
    if (!heading) return true
    const headingText = getHeadingText(heading)
    if (googleHeadings.includes(headingText)) return false
    if (headingText.startsWith('images for')) return false
    return true
}


// check if google result contains link
const isHitLinked = (hit) => {
    if (hit.querySelector('span a:first-child')) return true
    return false
}


// get search result items from SERP
const getSearchResults = () => {
    const allHits = Array.from(document.querySelectorAll('.MjjYud'))
    const nonGoogleHits = allHits.filter(hit => isHitNonGoogle(hit))
    const linkedHits = nonGoogleHits.filter(hit => isHitLinked(hit))
    return linkedHits
}


// check if result is from specified domains
const isDomain = (domainsList, domain, domainName, url) => {
    if (domainsList.length == 0) return true
    if (domainsList.includes(domain)) return true
    const isSubDomain = domainsList.some(dom => dom.includes(domain) || domain.includes(dom))
    if (isSubDomain) return true
    const isSameDomainName = domainsList.some(dom => dom.includes(domainName))
    if (isSameDomainName) return true
    const isInUrl = domainsList.some(dom => url.includes(dom))
    if (isInUrl) return true
    return false
}


// collect rank from google page
const collectRanks = (domains) => {
    let ranks = []
    const searchResults = getSearchResults()
    searchResults.forEach((hit, i) => {
        const node = hit.querySelector('span a:first-child').parentNode
        const urlNode = node.querySelector('a')
        const url = urlNode ? urlNode.href : ''
        const titleNode = node.querySelector('h3')
        const title = titleNode ? titleNode.innerText.trim() : ''
        const match = url.match(REGEX_DOMAIN)
        const domain = match ? match[0] : ''
        const domainNameNode = node.querySelector('.VuuXrf')
        const domainName = domainNameNode ? domainNameNode.innerText.trim() : ''
        if (isDomain(domains, domain, domainName, url)) {
            ranks.push({
                domainName,
                domain,
                url,
                title,
                rank: i + 1
            })
        }
    })
    return ranks
}


// store ranks to extension storage
const storeRanks = async (rankList) => {
    const q = new URL(window.location).searchParams.get('q')
    const { ranks } = await chrome.storage.local.get('ranks')
    let temp = []
    if (ranks) temp.push(...ranks)
    await chrome.storage.local.set({
        ranks: [
            ...temp,
            {
                keyword: q,
                ranks: rankList
            }
        ]
    })
}


// delete current keyword and go to next
const delAndGotoNext = async () => {
    let { keywords } = await chrome.storage.local.get('keywords')
    if (keywords && keywords.length >= 0) {
        keywords.shift()
        await chrome.storage.local.set({ keywords })
        const nextKeyword = keywords[0]
        if (nextKeyword) {
            window.location.href = getUrl(nextKeyword)
        } else {
            const resultPageUrl = chrome.runtime.getURL('resources/result.html')
            window.location.href = resultPageUrl
        }
    }
}


// check if current page is not captcha page
const isNotCaptcha = () => {
    return !window.location.href.includes('/sorry/index')
}


// main
(async () => {
    try {

        // check if the page is not SERP and command is set to 'start'
        const q = new URL(window.location).searchParams.get('q')
        const { command } = await chrome.storage.local.get('command')
        if (!q && command && command == 'start' && isNotCaptcha()) {

            // reset command and start
            addModal()
            await chrome.storage.local.set({ command: 'sleep' })
            const { keywords } = await chrome.storage.local.get('keywords')
            window.location.href = getUrl(keywords[0])
            return

        }

        // check if the page is SERP and there are keywords in store
        const { keywords } = await chrome.storage.local.get('keywords')
        if (q && keywords && keywords.length > 0 && isNotCaptcha()) {

            // proceed to collect ranks
            addModal(keywords.length)
            const { domains } = await chrome.storage.local.get('domains')
            const { target } = await chrome.storage.local.get('target')
            const timer = setInterval(async () => {
                if (document.readyState == 'complete') {
                    clearTimer()
                    await scrollToLoadMore(target)
                    const ranks = collectRanks(domains)
                    await storeRanks(ranks)
                    await delAndGotoNext()
                }
            }, 100)
            const clearTimer = () => clearInterval(timer)
        }

    } catch (error) {
        console.log(error.message)
    }
})()
