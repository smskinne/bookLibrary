//Digital Bookshelf
//Created by Shaun Skinner

class Bookshelf { // main app class
    constructor() {
        this.bookshelf = []; // array to hold bookshelf books
        this.wishlist = []; // array to hold wishlist books
        this.currentFilter = 'all'; // current filter for bookshelf view

        this.initializeApp(); // initialize the app
    }

    //Initialize

    initializeApp() {
        this.loadData();
        this.startupEventListeners();
        this.renderBookshelf();
        this.renderWishlist();
    }

    //load data
    loadData(){
        const savedBookshelf = localStorage.getItem('digitalBookshelf');
        const savedWishlist = localStorage.getItem('digitalWishlist');

        this.bookshelf = savedBookshelf ? JSON.parse(savedBookshelf) : [];
        this.wishlist = savedWishlist ? JSON.parse(savedWishlist) : [];
    }

    //Save Data

    saveData() {
        localStorage.setItem('digitalBookshelf', JSON.stringify(this.bookshelf));
        localStorage.setItem('digitalWishlist', JSON.stringify(this.wishlist));
    }

    //Event Listeners
    startupEventListeners(){
        // Close book info section
        document.getElementById('closeBookInfo').addEventListener('click', () => {
            document.getElementById('book-info').hidden = true;
        });
                // Search functionality
        document.getElementById('searchButton').addEventListener('click', () => this.searchBooks());
        document.getElementById('searchInput').addEventListener('keypress', (e) => { //Search on click or enter key
            if (e.key === 'Enter') this.searchBooks();
        });

        //clear results
        document.getElementById('clearButton').addEventListener('click', () => { 
            document.getElementById('searchResults').innerHTML = '';
            document.getElementById('searchResults').hidden = true;
            document.getElementById('searchInput').value = '';
        });

        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => { 
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentFilter = e.target.dataset.filter;
                this.renderBookshelf();
            });
        });
    }
 
    
    //Search for books
    async searchBooks() {
        const query = document.getElementById('searchInput').value.trim(); // get search input
        const resultsContainer = document.getElementById('searchResults'); // results container

        if(!query) { // empty input check
            alert('Please enter a Title or Author');
            return;
        }

        try { // show loading message
            resultsContainer.innerHTML = '<div class="empty-message">Searching...</div>';
            resultsContainer.classList.remove('hidden');

            //fetch
            const response = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=9&fields=key,title,author_name,cover_i,first_publish_year,isbn,edition_key`); // limit to 9 results
            if(!response.ok) throw new Error('Bad network response'); // check response
            const data = await response.json(); // parse JSON into a JavaScript object

            //display results
            //Passes the array of books to displaySearchResults function
            this.displaySearchResults(data.docs); // pass book docs to display function

        } catch (err) { // handle errors
            console.error(err);
            resultsContainer.innerHTML = '<div class="empty-message">Error searching books</div>';
        }
    }

    // display search results
    displaySearchResults(books) { // books is an array of book objects pasased from Openlibrary's API during searchBooks()
        const resultsContainer = document.getElementById('searchResults');

        if(!books || books.length === 0) {
            resultsContainer.innerHTML = '<div class="empty-message">No books found. Try a different Search.</div>';
            return;
        }

        // ensure results area is visible
        resultsContainer.hidden = false;
        // build results HTML
        resultsContainer.innerHTML = books.map(book => { // for each book object
            const title = book.title || 'Unknown Title'; // get title
            const author = book.author_name ? book.author_name[0] : 'Unknown Author'; //get Author
            const coverId = book.cover_i; //get cover ID
            const coverUrl = coverId ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg` : ''; //build cover URL
            const firstPublishYear = book.first_publish_year || ''; //get first publish year
            const isbns = Array.isArray(book.isbn) ? book.isbn : []; //get ISBNs array
            
            // return HTML for each book
            return `
                <div class="search-result-item">
                    <div class="search-result-cover">
                        ${coverUrl ? `<img src="${coverUrl}" alt="${title}" class="search-result-cover">` : 'No cover'}
                    </div>
                    <div class="search-result-info">
                        <div class="search-result-title">${title}</div>
                        <div class="search-result-author">by ${author}</div>
                    </div>
                    <div class="book-actions">
                        <button class="action-btn btn-primary" onclick="bookshelfApp.addToBookshelf({
                            id: '${book.key}',
                            title: '${bookshelfApp.escapeString(title)}',
                            author: '${bookshelfApp.escapeString(author)}',
                            coverUrl: '${coverUrl}',
                            firstPublishYear: '${firstPublishYear}',
                            isbn: '${isbns}',
                            status: 'want-to-read'
                        })">Add to Bookshelf</button>
                        <button class="action-btn btn-secondary" onclick="bookshelfApp.addToWishlist({
                            id: '${book.key}',
                            title: '${bookshelfApp.escapeString(title)}',
                            author: '${bookshelfApp.escapeString(author)}',
                            coverUrl: '${coverUrl}',
                            firstPublishYear: '${firstPublishYear}',
                            isbn: '${isbns}'
                        })">Add to Wishlist</button>
                    </div>
                </div>
            `; // end return
        }).join(''); // end map

        // attach click listeners to results

        this.searchResultListeners();
    }

    // Add click event listener for search result items
    searchResultListeners() {
        document.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if(e.target.tagName === 'BUTTON') return;

                document.querySelectorAll('.search-result-item').forEach(i => i.classList.remove('active'));

                item.classList.add('active');
            });
        });
    }

    // escape strings 
    escapeString(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'")
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '');
    }

    // add a book to the bookshelf (or update status)
    addToBookshelf(item) {
        if (!item || !item.id) return;

        const existing = this.bookshelf.find(b => b.id === item.id);
        if (existing) {
            // update status if provided
            if (item.status) existing.status = item.status;
        } else {
            const book = {
                id: item.id,
                title: item.title || 'Unknown Title',
                author: item.author || 'Unknown Author',
                coverUrl: item.coverUrl || '',
                firstPublishYear: item.firstPublishYear || '',
                isbn: item.isbn ? item.isbn.slice(0, 13) : '',
                status: item.status || 'want-to-read',
                
            };
            this.bookshelf.push(book);
        }

        // remove from wishlist if present
        const wishIndex = this.wishlist.findIndex(w => w.id === item.id);
        if (wishIndex !== -1) this.wishlist.splice(wishIndex, 1);

        this.saveData();
        this.renderBookshelf();
        this.renderWishlist();
    }

    addToWishlist(item) {
        if (!item || !item.id) return;

        const exists = this.wishlist.find(b => b.id === item.id);
        if (exists) return; // already in wishlist

        const book = {
            id: item.id,
            title: item.title || 'Unknown Title',
            author: item.author || 'Unknown Author',
            coverUrl: item.coverUrl || '',
            firstPublishYear: item.firstPublishYear || ''
        };

        // don't add to wishlist if already on bookshelf
        if (!this.bookshelf.find(b => b.id === item.id)) {
            this.wishlist.push(book);
            this.saveData();
            this.renderWishlist();
        }
    }

    removeFromBookshelf(id) { // remove a book from the bookshelf
        const idx = this.bookshelf.findIndex(b => b.id === id);
        if (idx === -1) return;
        this.bookshelf.splice(idx, 1);
        this.saveData();
        this.renderBookshelf();
    }

    removeFromWishlist(id) { // remove a book from the wishlist
        const idx = this.wishlist.findIndex(b => b.id === id);
        if (idx === -1) return;
        this.wishlist.splice(idx, 1);
        this.saveData();
        this.renderWishlist();
    }

    updateBookStatus(id, status) { // update the reading status of a book
        const book = this.bookshelf.find(b => b.id === id);
        if (!book) return;
        book.status = status;
        this.saveData();
        this.renderBookshelf();
    }

    // render the bookshelf area
    renderBookshelf() {
        const container = document.getElementById('bookshelfContainer');
        const countEl = document.getElementById('bookPileCount');
        if (!container) return;

        const booksToShow = this.currentFilter === 'all'
            ? this.bookshelf
            : this.bookshelf.filter(b => b.status === this.currentFilter);

        if (!booksToShow || booksToShow.length === 0) {
            container.innerHTML = '<div class="empty-message">No books in your pile.</div>';
        } else {
            container.innerHTML = booksToShow.map(b => {
                return `
                    <div class="book-card" data-id="${b.id}" data-title="${this.escapeString(b.title)}">
                        <div class="book-cover">${b.coverUrl ? `<img src="${b.coverUrl}" alt="${this.escapeString(b.title)}">` : 'No cover'}</div>
                        <div class="book-info">
                            <div class="book-title">${this.escapeString(b.title)}</div>
                            <div class="book-author">${this.escapeString(b.author)}</div>
                            <div class="book-controls">
                                <select onchange="bookshelfApp.updateBookStatus('${b.id}', this.value)">
                                    <option value="want-to-read" ${b.status === 'want-to-read' ? 'selected' : ''}>Want to Read</option>
                                    <option value="reading" ${b.status === 'reading' ? 'selected' : ''}>Currently Reading</option>
                                    <option value="finished" ${b.status === 'finished' ? 'selected' : ''}>Finished</option>
                                </select>
                                <button onclick="bookshelfApp.removeFromBookshelf('${b.id}')">Remove</button>
                                <button onclick="bookshelfApp.addToWishlist({ id: '${b.id}', title: '${this.escapeString(b.title)}', author: '${this.escapeString(b.author)}', coverUrl: '${b.coverUrl || ''}', firstPublishYear: '${b.firstPublishYear || ''}' })">Move to Wishlist</button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        if (countEl) countEl.textContent = `(${this.bookshelf.length} books)`;
        // attach click listeners for detail alert
        this.bookDetailListeners();
    }

    // render the wishlist area
    renderWishlist() {
        const container = document.getElementById('wishlistContainer');
        const countEl = document.getElementById('wishlistCount');
        if (!container) return;

        if (!this.wishlist || this.wishlist.length === 0) {
            container.innerHTML = '<div class="empty-message">No books in your wishlist.</div>';
        } else {
            container.innerHTML = this.wishlist.map(b => {
                return `
                    <div class="book-card" data-id="${b.id}" data-title="${this.escapeString(b.title)}">
                        <div class="book-cover">${b.coverUrl ? `<img src="${b.coverUrl}" alt="${this.escapeString(b.title)}">` : 'No cover'}</div>
                        <div class="book-info">
                            <div class="book-title">${this.escapeString(b.title)}</div>
                            <div class="book-author">${this.escapeString(b.author)}</div>
                            <div class="book-controls">
                                <button onclick="bookshelfApp.addToBookshelf({ id: '${b.id}', title: '${this.escapeString(b.title)}', author: '${this.escapeString(b.author)}', coverUrl: '${b.coverUrl || ''}', firstPublishYear: '${b.firstPublishYear || ''}', status: 'want-to-read' })">Add to Bookshelf</button>
                                <button onclick="bookshelfApp.removeFromWishlist('${b.id}')">Remove</button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        if (countEl) countEl.textContent = `(${this.wishlist.length} books)`; // update count
        // attach click listeners for detail alert on wishlist items too
        this.bookDetailListeners();
    }
    // book div click listener
    bookDetailListeners() {
        document.querySelectorAll('.book-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.tagName === 'BUTTON' || e.target.tagName === 'SELECT') return;
                // call renderBookDetails and pass the card's title
                const id = card.dataset.id;
                const book = this.bookshelf.find(b => b.id === id) || this.wishlist.find(b => b.id === id);
                if (!book) return;
                this.renderBookDetails(book);




            });
        });
    }
    // Fetch description from the Openlibrary Works API
    async fetchWorkDescription(workKey) {
        if (!workKey) return null;
        try {
            const res = await fetch(`https://openlibrary.org${workKey}.json`);
            if (!res.ok) return null;
            const data = await res.json();

            // description can be a string or an object { value: "..."}
            if (typeof data.description === 'string') {
                return data.description; // check for string and return string
            } else if (data.description && typeof data.description.value === 'string') { // check for object with value
                return data.description.value; // return value
            }
            return null;
        } catch (e) { // handle errors
            console.error('Failed to fetch description:', e);
            return null;
        }
    }

    async fetchPagesByIsbn(isbn) {
        if (!isbn) return null;
        try {
            const res = await fetch(`https://openlibrary.org/isbn/${isbn}.json`);
            if (!res.ok) return null;
            const ed = await res.json();
            return typeof ed.number_of_pages === 'number' ? ed.number_of_pages : null;
        } catch {
            return null;
        }
    }
    // Render book details 
    async renderBookDetails(book) {
        const bookInfoSection = document.getElementById('book-info');
        if (!bookInfoSection) {
            console.error('book-info section not found');
            return;
        }
        
        const title = book.title || 'Unknown Title';
        const author = book.author || 'N/A';
        const year = book.firstPublishYear || 'N/A';
        const coverUrl = book.coverUrl || '';
        const description = await this.fetchWorkDescription(book.id);
        const pages = await this.fetchPagesByIsbn(book.isbn);

        // Unhide book info section
        bookInfoSection.hidden = false;
        
        // Update the content in #bookDetails
        const detailsContainer = document.getElementById('book-details');
        if (detailsContainer) {
            detailsContainer.innerHTML = `
                ${coverUrl ? `<img src="${coverUrl}" alt="${title} cover" style="max-width:200px; margin-bottom: 1rem;">` : '<p>No cover available</p>'}
                <h4>${title}</h4>
                <p><strong>Author:</strong> ${author}</p>
                <p><strong>Published:</strong> ${year}</p>
                <p><strong>Description:</strong> ${description ? description : 'No description available.'}</p>
                <p><strong>Pages:</strong> ${pages !== null ? pages : 'N/A'}</p>
            `;
        }
        

    }
}

// instantiate app (outside class definition)
const bookshelfApp = new Bookshelf();
window.bookshelfApp = bookshelfApp;