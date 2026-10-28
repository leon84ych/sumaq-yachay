# Search Across Catalog, Learn and Questions

The search field is shared across **Catalog**, **Learn**, **Quiz**, and the searchable domain views inside a catalog source, including **Questions**.
Start a search in one view and continue studying in another without entering the same filters again.

## Start with text

Type a book name, author, contributor, domain, tag word, or part of an entry's content. Matching ignores case and accents in the shared search.
For example, `James Joyce` can find his catalog sources, learning entries, and questions.

Unquoted text is treated as one phrase, not as separate OR keywords. To add exact book, author, or contributor restrictions, use the clickable names or the expressions below.

## Add filters by clicking

| Click | Filter added | What must match |
| --- | --- | --- |
| A tag on an entry | `#memory` | That exact tag, not a longer tag such as `#memory-loss` |
| A book name in a card header | `book:"Ulysses"` | The entry's book metadata |
| An author name in a card header | `author:"James Joyce"` | The entry's author metadata |
| A contributor name in a card footer | `contributor:"leon84ych"` | The entry's stored creator identity |

Each click adds to the current query. It does not replace existing text or filters, and clicking the same value again does not add a duplicate. Selected controls are marked as active; clicking them again does not remove the filter.

Contributor labels display only the username. If the stored identity is an email address, the generated filter retains the full address, for example `contributor:"leon84ych@gmail.com"`. Accounts sharing a username are not merged.

## Combine conditions

All conditions are combined with **AND**. This search requires an entry from the selected book and author, created by the selected contributor, with both tags:

```text
book:"Ulysses" author:"James Joyce" contributor:"leon84ych" #memory #identity
```

Book, author, and contributor filters check their metadata, not names merely mentioned in the body. Several exact book or author constraints must all match; selecting different books can therefore leave no results.

You can type these expressions directly. Keep quotation marks around metadata values, especially names containing spaces. A standalone quoted phrase such as `"stream of consciousness"` searches content rather than selecting a book or author.

## What each view shows

### Catalog

Catalog returns **books and sources**, not individual notes. Text can match source metadata or locally stored content. A combined query such as `author:"James Joyce" #memory` returns sources with a locally stored entry that satisfies the tag and the book's author context.

Tag, domain, and contributor searches depend on content already stored on this device. Remote-only content is not searched automatically. If results are missing, load the relevant source/domain data before trying again.

The **subject** selection and **Active Only** checkbox are additional Catalog-only filters. They do not carry into Learn or Questions; the shared search does.

### Learn

Learn returns **individual learning entries** across the locally available books and domains. Every displayed item must satisfy the current query. Results arrive in random batches of up to 20; **Load 20 more** continues the same filtered feed.

Changing the search clears the previous results and starts a new filtered batch. The view briefly waits after typing before loading, so allow it to finish before judging the result count.

### Questions inside a catalog source

The **Questions** domain filters the question rows loaded for the currently opened source. It searches the prompt, answer, source term/domain, tags, book/author context, and contributor. It does not turn that source-specific list into an all-books question search.

The other domain views behave similarly: the shared query applies within the current book and domain. Search hides nonmatching entries; it does not delete or modify them.

### Quiz

The top-navigation **Quiz** view uses the same query to select a random practice batch of up to 10 locally stored questions across books. Changing the query replaces the current batch and resets the current answer state.

Quiz only shows existing questions; searching or selecting a tag does not generate new ones. A domain filter can match a question's source domain, so a Concepts search can find questions based on concepts.

## Remove filters and keep studying

- Remove a hashtag or a complete `book:`, `author:`, or `contributor:` expression from the search field to broaden the results.
- Clear the field to remove all shared search conditions. Catalog's separate subject and Active Only controls remain unchanged.
- Move between Catalog, Learn, and Quiz to reuse the current query. It remains available during navigation and resets when you reload the application.
- On mobile, use the same search field and clickable tags, headers, and contributors; the filtering rules are identical.

## If there are no results

Check for conflicting conditions, a tag that is absent from the entry, a contributor identity that differs from its displayed username, Catalog-only filters, or content that has not been loaded locally. A book returned by Catalog can contain some matching entries without every one of its domains containing a match.