# Add Domain to Catalog

A domain is a structured section inside a catalog source, such as Concepts, Quotes, or Questions.
Adding a domain creates a sheet for that source; it does not register a new book or import a master catalog.

## Before you begin

- Register or load a catalog source, then open it from **Catalog**.
- Configure the Google Apps Script backend and sign in with permission to create sheets. The **Domain** action requires administrator permissions.
- Turn off **Local Sample Data** for this workflow. Creating built-in domain sheets through the selector is not supported in sample mode; use the domains already included in the sample books instead.

## Create a domain

1. Open **Catalog** and select the book or source that will contain the domain.
2. Select **+ Domain** in the source header.
3. Open **Select Domain** and choose one of the available domain types. Only types not already present in this source are listed.
4. Selecting a type starts creation immediately. Wait for the request to finish; the selector is disabled while creation is in progress.
5. On success, the application refreshes the source's sheets and selects the new domain tab.

Before choosing a type, you can close the selector with its cancel button. If there are no options left, all supported domain types are already present in this source.

## Choose the right domain

| Domain | Typical content |
| --- | --- |
| Index | Chapters, themes, subthemes, and the tag taxonomy |
| Concepts | Ideas, definitions, and categories |
| Glossary | Vocabulary and contextual meanings |
| Characters | People or characters and their descriptions |
| Places | Locations and geographical context |
| Quotes | Quotations and reflections |
| Passages | Longer reading excerpts |
| Book Events | Events and their sequence |
| Relations | Relationships between characters |
| Associations | Connections between concepts |
| Questions | Study prompts, answers, and practice material |

The selector uses the application's predefined domain types and their standard fields. It does not create an arbitrary new domain type or let you design a new schema.

## Add content to the domain

1. Keep the new domain selected. On desktop, use the domain tabs; on mobile, use the view selector in the source header.
2. Select **+ Entry** to open its form. Adding content requires write permission.
3. Complete the required fields and choose tags where applicable.
4. For tag-using domains, define the needed tags in **Index** first; other domain forms validate tags against that taxonomy.
5. Save and review the entry's synchronization indicator. Creating the domain alone does not populate it with learning entries or questions.

## If something is missing

- **No Domain action:** check your sign-in status and permissions.
- **A type is missing from the selector:** it may already exist; select its tab instead.
- **Creation fails:** check the backend configuration, connectivity, and access to the source. Review the error before trying again.
- **A populated domain looks empty:** clear or adjust the shared search. Existing text, tag, book, author, and contributor filters also apply inside catalog domains.