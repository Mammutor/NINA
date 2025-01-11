![Project Logo](documenting/githubicon_SaBiNE.png)

# SaBiNE

![Project Status](https://img.shields.io/badge/Status-Active-brightgreen)
![License](https://img.shields.io/badge/License-Apache%202.0-blue)
![GitHub Contributors](https://img.shields.io/github/contributors/LHesse-UM/SaBiNE)

## Table of Contents

1. [About the Project](#about-the-project)
2. [Technologies](#technologies)
3. [Data Acquisition](#data-acquisition)
4. [Papers](#papers)
5. [Start Local Application](#start-local-application)
6. [Onboarding](#onboarding)
7. [Project Results](#project-results)
8. [License](#license)
9. [Contact](#contact)

## About the Project

**SaBiNE**(Safe Bicycle Navigation Experience) is a university project conducted as part of the Geoinformation in Society Seminar, which is included in the Interdisciplinary Aspects module from the Geoinformatics and Spatial Data Science Master of Science study program of Uni Münster.

It aims to create a navigation tool for cyclists in Münster that displays safe, balanced, and fast routes tailored to how confident the user feels on their bike. The project addresses the problem that, for instance, Google Maps only shows the fastest route. However, if the route includes complex intersections or areas with a high number of accidents, an alternative route is prioritized. 

The scope of the project was reduced from covering the entire city of Münster to focusing on two smaller areas to ensure that it could be completed within a feasible timeframe.

## Technologies

[**Open Pioneer Trails**](https://www.conterra.de/trails) is a versatile open-source framework designed for creating custom web-based GeoIT client applications. It leverages modern tools to deliver an exceptional developer experience. Available for free on GitHub, the project is actively maintained by [con terra](https://www.conterra.de) and [52°North](https://52north.org).

Published via GitHub Pages

## Data Acquisition

- [Overpass API](https://overpass-turbo.eu)

- [Open Data Münster House Numbers](https://opendata.stadt-muenster.de/dataset/hausnummernliste)

- [Open Data Münster Street List](https://opendata.stadt-muenster.de/dataset/straßenliste/resource/eff542d9-a626-4499-89c8-65b22e1b9d1c)

## Papers

- [On Cycling Risk and Discomfort: Urban Safety Mapping
and Bike Route Recommendations](https://arxiv.org/pdf/1905.08775) from Castells-Graells et al.
- [Berechnung sicherer Fahrradwege](https://arxiv.org/pdf/2403.18363)
from Dr. Sudhoff Santos and Kroll
- [A Hybrid Model for Evaluating the Bikeability of Urban Bicycle Systems](https://www.mdpi.com/2075-1680/12/2/155) from Hsu et al.


## Start Local Application
Ensure that you have Node (Version 18 or later) and pnpm (Version 9.x) installed.

Then execute the following commands to get started:

```bash
$ git clone https://github.com/LHesse-UM/SaBiNE.git            # Clone the repository
$ cd opt                                                       # Navigate to opt-Folder
$ pnpm install                                                 # Install dependencies
$ pnpm run dev                                                 # Launch development server
```

## Onboarding

1. Enter Start and Destination Adress
![placeholder](documenting/placeholder.png)

2. Route Preferences
![placeholder](documenting/placeholder.png)

3. Start Button
![placeholder](documenting/placeholder.png)

4. Route Rating
![placeholder](documenting/placeholder.png)

5. Options
![placeholder](documenting/placeholder.png)

## Project Results

The complete project results are available online:

[ **SaBiNE**](https://LHesse-UM.github.io/SaBiNE/)

Visit the website to explore the interactive results and functionalities.

## License

This project is licensed under the Apache License 2.0. 

Copyright 2024 by the following contributors:

- [tkrumrei](https://github.com/tkrumrei)
- [LHesse-UM](https://github.com/LHesse-UM)
- [tlehman1](https://github.com/tlehman1)

You may read the full license in the [LICENSE](LICENSE) file included in this repository or visit the official [Apache 2.0 License](http://www.apache.org/licenses/LICENSE-2.0).

## Contact

If you have any questions, feedback, or suggestions, please feel free to reach out to us:

- **tkrumrei**: [GitHub Profile](https://github.com/tkrumrei)
- **LHesse-UM**: [GitHub Profile](https://github.com/LHesse-UM)
- **tlehman1**: [GitHub Profile](https://github.com/tlehman1)

We appreciate your interest in **SaBiNE** and look forward to your feedback!
