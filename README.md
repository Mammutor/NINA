![Project Logo](documenting/githubicon_SaBiNE.png)

# NINA

![Project Status](https://img.shields.io/badge/Status-Completed-blue)
![License](https://img.shields.io/badge/License-Apache%202.0-blue)
![GitHub Contributors](https://img.shields.io/github/contributors/LHesse-UM/SaBiNE)

## Table of Contents

1. [About the Project](#about-the-project)
2. [Technologies](#technologies)
3. [Data Acquisition](#data-acquisition)
4. [For Further Developement](#for-further-developement)
5. [Onboarding](#onboarding)
6. [Project Results](#project-results)
7. [License](#license)
8. [Contact](#contact)

## About the Project

**[NINA](https://lhesse-um.github.io/SaBiNE/)** (Navigational Insights for Non-motorized Accessibility) is a university project conducted as part of the #ifgiHACK25 in the FOSSGIS 2025, which is based on the study project of https://github.com/LHesse-UM.

The project aims to create a navigation tool specifically for cyclists in Münster, offering safe, balanced, and fast routes based on the user’s confidence level while cycling. Unlike conventional tools like Google Maps, which prioritize the fastest route, SaBiNE focuses on providing a more customized navigation experience.

## Technologies

[**Open Pioneer Trails**](https://github.com/open-pioneer) is a versatile open-source framework designed for creating custom web-based GeoIT client applications. It leverages modern tools to deliver an exceptional developer experience. Available for free on GitHub, the project is actively maintained by [con terra](https://www.conterra.de) and [52°North](https://52north.org).

## Data Acquisition

- [Valhalla](https://.) for the routing and we tweaked settings

- [Transitos](https://.) For getting the adresses

- [Basemap](https://.) for a better Design than the normal OSM Basemap

## For Further Developement

How to start your local application:

Ensure that you have Node (Version 18 or later) and pnpm (Version 9.x) installed.

Then execute the following commands to get started:

```bash
$ git clone https://github.com/Mammutor/NINA.git               # Clone the repository
$ cd opt                                                       # Navigate to opt-Folder
$ pnpm install                                                 # Install dependencies
$ pnpm run dev                                                 # Launch development server
```

## Onboarding

**1. Enter Start and Destination Address**

The "Enter Start and Destination Address" interface allows users to click on the map to set the start and destination points.

![placeholder](documenting/EnterStartAndDestinationAddress.png)

**2. Safe Route**

The "Safe Route" button lets users adjust their preferred route type: Safe or Fast based on their individual needs.

![placeholder](documenting/RoutePreferences.png)

**3. Start**

By clicking the "Go!" button, the system calculates the route based on your selected preferences and displays it on the map.

![placeholder](documenting/Start.png)

By selecting the **safest** route the "Route Rating" interface shows the Safety Rating of 1.0 and the distance of 2.18km and time of about 9 minutes.

![placeholder](documenting/Safest.png)

By selecting the **balenced** route the "Route Rating" interface shows the Safety Rating of 1.9 and the distance of 1.69km and time of about 7 minutes.

![placeholder](documenting/Balanced.png)

By selecting the **fastest** route the "Route Rating" interface shows the Safety Rating of 3.0 and the distance of 1.49km and time of about 6 minutes.

![placeholder](documenting/Fastest.png)

![placeholder](documenting/ShowStreetSafetyCategory.png)

## Project Results

The complete project results are available online published via GitHub Pages.

[ **SaBiNE**](https://LHesse-UM.github.io/SaBiNE/)

Visit the website to explore the interactive results and functionalities.

## License

This project is licensed under the Apache License 2.0. 

Copyright 2024 by the following contributors:

- [tkrumrei](https://github.com/tkrumrei)
- [LHesse-UM](https://github.com/LHesse-UM)
- [tlehman1](https://github.com/tlehman1)
- [Mammutor](https://github.com/Mammutor)
- [Justin K.](https://github.com/.)

You may read the full license in the [LICENSE](LICENSE) file included in this repository or visit the official [Apache 2.0 License](http://www.apache.org/licenses/LICENSE-2.0).

## Contact

If you have any questions, feedback, or suggestions, please feel free to reach out to us:

- **Mammutor**: [GitHub Profile](https://github.com/Mammutor)
- **Justin K.**: [GitHub Profile](https://github.com/.)

We appreciate your interest in **NINA** and look forward to your feedback!
