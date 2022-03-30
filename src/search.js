const admin = require("firebase-admin");
const db = admin.database();
const MiniSearch = require('minisearch')
const miniSearch = new MiniSearch({
    fields: ['name', 'description'], // fields to index for full-text search
    storeFields: ['id', 'name', 'price'] // fields to return with search results
});

class Search {

    constructor(opts = {}) {
        this.addWatchers('nfts');
        
        /*
            // miniSearch examples:
            setTimeout(()=>{
                const results = miniSearch.search('description')
                console.log(results);
            }, 1000);

            setTimeout((minPrice=50, maxPrice=100)=>{
                // doesn't get any results w/out also having some matching text in the search
                // asking for help - https://github.com/lucaong/minisearch/issues/144
                const results = miniSearch.search('crazy', {
                    filter: (result) => {
                        return result.price >= minPrice && result.price <= maxPrice
                    }
                });
                console.log(results);
            }, 2000);
        */
    };

    addWatchers(index) {
        db.ref(index).on('child_added', this.createIndex.bind(this, index));
        // db.ref(index).on('child_changed', this.updateIndex.bind(this, index));
        // db.ref(index).on('child_removed', this.removeIndex.bind(this, index));
    };

    createIndex(index, snap) {
        miniSearch.add({id: snap.key, ...snap.val().metadata, price: snap.val()?.price});
    };

    updateIndex(index, snap) {
        // need to look into how to properly update items - think they have to be removed then re-added
        // https://lucaong.github.io/minisearch/classes/_minisearch_.minisearch.html#remove
        // related - https://github.com/lucaong/minisearch/issues/45
    };

    removeIndex(index, snap) {
        console.log("removed - ", snap.key)
    };


}

module.exports = Search