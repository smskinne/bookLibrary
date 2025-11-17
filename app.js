//Digital Bookshelf
//Created by Shaun Skinner

class Bookshelf {
    constructor() {
        this.bookshelf = [];
        this.wishlist = [];
        this.currentFilter = 'all';

        this.initializeApp();
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

                // Search functionality
        document.getElementById('searchButton').addEventListener('click', () => this.searchBooks());
        document.getElementById('searchInput').addEventListener('keypress', (e) => {
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
        const query = document.getElementById('searchInput').value.trim();
        const resultsContainer = document.getElementById('searchResults');

        if(!query) {
            console.log("Nothing entered");
            alert('Please enter a Title or Author');
            return;
        }

        try {
            resultsContainer.innerHTML = '<div class="empty-message">Searching...</div>';
            resultsContainer.classList.remove('hidden');

            //fetch
            const response = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=9`);
            const data = await response.json();

            this.displaySearchResults(data.docs);
            console.log("done");
            console.log(data.docs);

        } catch (err) {
            console.error(err);
            resultsContainer.innerHTML = '<div class="empty-message">Error searching books</div>';
        }
    }

    // display search results
    displaySearchResults(books) {
        const resultsContainer = document.getElementById('searchResults');

        if(!books || books.length === 0) {
            resultsContainer.innerHTML = '<div class="empty-message">No books found. Try a different Search.</div>';
            return;
        }

        // ensure results area is visible
        resultsContainer.hidden = false;

        resultsContainer.innerHTML = books.map(book => {
            const title = book.title || 'Unknown Title';
            const author = book.author_name ? book.author_name[0] : 'Unknown Author';
            const coverId = book.cover_i;
            const coverUrl = coverId ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg` : '';
            const isbn = book.isbn ? book.isbn[0] : '';
            const firstPublishYear = book.first_publish_year || '';

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
                            title: '${this.escapeString(title)}',
                            author: '${this.escapeString(author)}',
                            coverUrl: '${coverUrl}',
                            isbn: '${isbn}',
                            firstPublishYear: '${firstPublishYear}',
                            status: 'want-to-read'
                        })">Add to Bookshelf</button>
                        <button class="action-btn btn-secondary" onclick="bookshelfApp.addToWishlist({
                            id: '${book.key}',
                            title: '${this.escapeString(title)}',
                            author: '${this.escapeString(author)}',
                            coverUrl: '${coverUrl}',
                            isbn: '${isbn}'
                        })">Add to Wishlist</button>
                    </div>
                </div>
            `;
        }).join('');

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

    // small helper to escape single quotes/backslashes for inline onclick payloads
    escapeString(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'")
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '');
    }

    // add a book to the bookshelf (or update status if already exists)
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
                isbn: item.isbn || '',
                firstPublishYear: item.firstPublishYear || '',
                status: item.status || 'want-to-read'
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
            isbn: item.isbn || ''
        };

        // don't add to wishlist if already on bookshelf
        if (!this.bookshelf.find(b => b.id === item.id)) {
            this.wishlist.push(book);
            this.saveData();
            this.renderWishlist();
        }
    }

    removeFromBookshelf(id) {
        const idx = this.bookshelf.findIndex(b => b.id === id);
        if (idx === -1) return;
        this.bookshelf.splice(idx, 1);
        this.saveData();
        this.renderBookshelf();
    }

    removeFromWishlist(id) {
        const idx = this.wishlist.findIndex(b => b.id === id);
        if (idx === -1) return;
        this.wishlist.splice(idx, 1);
        this.saveData();
        this.renderWishlist();
    }

    updateBookStatus(id, status) {
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
                    <div class="book-card">
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
                                <button onclick="bookshelfApp.addToWishlist({ id: '${b.id}', title: '${this.escapeString(b.title)}', author: '${this.escapeString(b.author)}', coverUrl: '${b.coverUrl || ''}', isbn: '${b.isbn || ''}' })">Move to Wishlist</button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        if (countEl) countEl.textContent = `(${this.bookshelf.length} books)`;
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
                    <div class="book-card">
                        <div class="book-cover">${b.coverUrl ? `<img src="${b.coverUrl}" alt="${this.escapeString(b.title)}">` : 'No cover'}</div>
                        <div class="book-info">
                            <div class="book-title">${this.escapeString(b.title)}</div>
                            <div class="book-author">${this.escapeString(b.author)}</div>
                            <div class="book-controls">
                                <button onclick="bookshelfApp.addToBookshelf({ id: '${b.id}', title: '${this.escapeString(b.title)}', author: '${this.escapeString(b.author)}', coverUrl: '${b.coverUrl || ''}', isbn: '${b.isbn || ''}', status: 'want-to-read' })">Add to Bookshelf</button>
                                <button onclick="bookshelfApp.removeFromWishlist('${b.id}')">Remove</button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        if (countEl) countEl.textContent = `(${this.wishlist.length} books)`;
    }
}

// instantiate app and expose globally for inline handlers
const bookshelfApp = new Bookshelf();
window.bookshelfApp = bookshelfApp;