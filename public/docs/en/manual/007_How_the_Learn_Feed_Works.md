# How the Learn Feed Works

The **Learn** view brings together individual entries from your books. It chooses what to show
using your search, the time since an entry was last shown, and its review interval.

## What can appear

Learn includes concepts, quotes, passages, characters, places, events, relations, associations,
and glossary entries. Index entries and questions are not shown in this feed; questions are
available in **Quiz** and the Questions domain.

Learn starts with entries available on this device. When remote access is available, additional
content can be loaded as you continue scrolling. The current shared search filters the entries
before they are selected.

## How entries are selected

1. Learn finds entries that match the search and have not already appeared in the current feed.
2. It gives priority to entries that are **due**: those never shown before, or whose interval has
   elapsed since they were last shown.
3. If there are not enough due entries to fill a batch, entries that are not yet due can also
   appear. The interval is a priority, **not a guarantee** that an entry will be hidden until
   that many days have passed.
4. The candidates are shuffled, with an effort to include different domains in each batch.
   There is no guaranteed order by oldest entry.

Results arrive in batches of up to 20. Scroll toward the end to load more automatically; there is
no normal load-more button. A message appears when there are no results or the feed is exhausted.
If loading fails, use the displayed retry action. Changing the search starts a new feed, so an
entry from the previous results can appear again if it matches the new search.

## What happens when an entry is shown

Each entry has a **last shown** time and an **interval** measured in days. When a batch is added
to Learn, the app records the current time for every entry in that batch, including entries
farther down the page that you may not have scrolled to yet. An entry without an interval
starts with a one-day interval.

The interval uses powers of two: 1, 2, 4, 8, 16, 32, 64, 128 and 256 days by default.
The minimum is one day. The default maximum is 256 days; it can be configured by the application
to another positive power of two, but there is currently no control for it in the settings panel.

If you do not select a review action and the entry is shown again after its interval has elapsed,
its interval doubles, up to the configured maximum. It does not double on the first display or
when shown before it is due. Showing it early still updates its last-shown time, which is the
starting point for the next due calculation.

## Tell Learn whether you remembered

Each Learn card has two review buttons near the image-download button:

- **Clock — forgotten:** increases the forgotten count and halves the interval, down to one day.
- **Checkmark — recalled:** increases the recalled count and doubles the interval, up to the
  configured maximum.

For example, with a four-day interval, forgotten changes it to two days and recalled changes it
to eight days. The app records the review time. It does not also apply the no-interaction doubling
for that same review period. After a successful selection, both buttons are disabled and the
selected button stays highlighted while that card remains in the feed.

The next due calculation is based on when the entry was last added to the feed, not the time you
pressed the review button. Scheduling and review information are stored in this browser's local
data; do not assume they are shared with another browser or device.

## If an entry does not appear

Check the shared search and clear any unwanted filters. Make sure the book and its entries are
available on this device, and scroll until Learn reports the end of the feed. A due entry has
priority, but its exact position varies with the other matching entries and the randomized order.
