# MMM-BirthdayCelebration

A birthday celebration card with optional age, notes and confetti.

Version 0.1.0. MIT-licensed standalone MagicMirror module.

![Synthetic standalone module preview](docs/preview.png)

## Installation

From your MagicMirror installation directory:

```sh
cd modules
git clone https://github.com/QuietNodeLab/MMM-BirthdayCelebration.git
```

Alternatively, download the repository ZIP and extract it as the folder below.

Copy this folder into `MagicMirror/modules/MMM-BirthdayCelebration`. No extra
npm runtime packages or shared dashboard stylesheet are required. Use
MagicMirror 2.38.0 with Node 24 as the tested baseline; other versions still
need verification.

Copy `birthdays.example.json` to `MagicMirror/config/birthdays.json`. Keep real
data private and outside Git.

Add a module entry to your local config:

```js
{
  module: "MMM-BirthdayCelebration",
  position: "top_left",
  config: {
    "dataFile": "birthdays.json",
    "timezone": "Europe/London",
    "confetti": true
  }
}
```

## Behavior and configuration

The file has a `people` array. Each person needs `name` and a `date` in `MM-DD`
or `YYYY-MM-DD` form; `note` is optional. Omitting the year hides the age.
February 29 birthdays are celebrated on February 28 in non-leap years. The card
is empty on other days. `preview: true` shows an invented birthday without a
data file.

Options: `dataFile` (birthdays.json), `refreshInterval` (600000 ms), `timezone`
(null = browser zone), `showFromHour` (0), `showUntilHour` (24), `confetti`
(true), `preview` (false), `debugDate` (null or YYYY-MM-DD). Hour windows do not
cross midnight; use 0–24 for all day. Uses region-based layout; no fixed
dashboard coordinates. Multiple instances can read different files.

To reproduce the screenshot with the synthetic example, set
`debugDate: "2030-02-28"` and `confetti: false`.

## Synthetic data example

```json
{
  "people": [
    {
      "name": "Sample Person",
      "date": "2000-02-28",
      "note": "Have a wonderful day!"
    }
  ]
}
```

## Development

`npm ci --ignore-scripts` and `npm test` run offline with Node 24. External APIs
must be mocked. JSON date modules use calendar dates; the configured zone
selects "today". Private configuration and cache data are ignored. All example
people, locations and events are synthetic or public examples. Screenshots use
only mock data.

Styles are scoped to the module. Change its own card CSS in your local
custom.css if desired; do not copy a full dashboard theme. Keep filenames as
filenames rather than absolute deployment paths. JSON helpers search config
first, then the module. Timers stop when the module is suspended and restart
when it resumes.

See [VALIDATION.md](VALIDATION.md) for tests actually performed and their
limits.

## License and attribution

The custom package code is MIT-licensed under module contributors; see
[LICENSE](LICENSE). No source-project Git history, private configuration,
optional device services or upstream module implementation is bundled.
MagicMirror is a separate dependency. See [ATTRIBUTION.md](ATTRIBUTION.md) for
artwork and external data notes.
