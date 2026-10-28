# About Sumaq Yachay

Sumaq Yachay means **Beautiful Knowledge**. It is a collaborative self-study application and knowledge base that brings your reading sources, learning notes, and practice questions together.

> Self-education is, I firmly believe, the only kind of education there is.
> A school's only function is to facilitate self-education; if it fails to do that, it does nothing.
> Moreover, formal education ends; self-education never does.
>
> *Isaac Asimov*

## Your workspace

- **Catalog** organizes books and other sources by subject, topic, and author.
- **Learn** brings together learning entries such as definitions, processes, timelines, and diagrams.
- **Quiz** lets you practice questions associated with your learning material.

## Study session search

Search once for a book, author, domain, or tag. The keyword follows you between Catalog, Learn,
Quiz, and the searchable book-content views, including Questions. Changing it in one view updates
the others; clearing any search box removes the shared keyword. Subject and Active Only filters
remain specific to Catalog.

Click a tag on any domain entry to add it to the current search. For example, `James Joyce`
becomes `James Joyce #memory`. The text and every selected tag must match the entry; clicking
the same tag again does not add a duplicate. You can remove a hashtag from the search field
to broaden the results, or clear the field to remove every filter. Tag filters use exact matches.

Book names and author names on entry headers are also filters. Clicking one adds an exact
book or author constraint while keeping your text, tags, and other selections. For example,
`#memory author:"James Joyce" book:"Ulysses"` only includes matching entries from that book
and author. Clicking the same name again does not duplicate its filter. Remove its `book:`
or `author:` expression from the search field to remove that constraint.

Contributor names in entry footers are also clickable. Selecting one adds a filter such as
`contributor:"leon84ych"` and keeps your current text, tags, book, and author selections.
Only entries created by that contributor are shown across domains. The displayed name omits
the email domain, but filtering uses the full stored contributor identity when it is an email
address. Remove the `contributor:` expression or clear the search field to remove the filter.

Catalog can find related books through learning content stored locally on this device. Remote
content must be loaded locally before it can match those searches. The keyword lasts while the
application is open and resets when you reload the page.

Google Sheets and a Google Apps Script backend provide remote storage. The application also keeps local data in your browser. Available actions depend on your permissions and the selected data mode.

## Getting started

1. Open **Settings** to choose your language, theme, and text size.
2. Try **Local Sample Data** to explore without contacting the application server, or configure the backend for your own data.
3. Open **Catalog** to clone a master catalog from a shared link or register a source.
4. Explore **Learn** and **Quiz** after your learning entries are available locally.

## Data and access

Local sample changes stay on this device. Remote operations require connectivity and appropriate permissions. Clearing local data does not delete server data, but it does remove local database contents, including local-only changes.

Select the application name in the top navigation to return to this manual. The language and appearance follow your settings.