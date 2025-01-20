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
5. [For Further Developement](#for-further-developement)
6. [Onboarding](#onboarding)
7. [Project Results](#project-results)
8. [License](#license)
9. [Contact](#contact)

## About the Project

**[SaBiNE](https://lhesse-um.github.io/SaBiNE/)** (Safe Bicycle Navigation Experience) is a university project conducted as part of the Geoinformation in Society Seminar, which is included in the Interdisciplinary Aspects module from the Geoinformatics and Spatial Data Science Master of Science study program of Uni Münster.

The project aims to create a navigation tool specifically for cyclists in Münster, offering safe, balanced, and fast routes based on the user’s confidence level while cycling. Unlike conventional tools like Google Maps, which prioritize the fastest route, SaBiNE focuses on providing a more customized navigation experience.

To ensure the project could be completed within a manageable scope, its coverage was limited to two specific areas within Münster rather than the entire city. This approach allowed the team to focus on delivering a functional and reliable solution.

## Technologies

[**Open Pioneer Trails**](https://github.com/open-pioneer) is a versatile open-source framework designed for creating custom web-based GeoIT client applications. It leverages modern tools to deliver an exceptional developer experience. Available for free on GitHub, the project is actively maintained by [con terra](https://www.conterra.de) and [52°North](https://52north.org).

## Data Acquisition

- [Overpass API](https://overpass-turbo.eu) for downloading the street network of the two areas.

- [Open Data Münster House Numbers](https://opendata.stadt-muenster.de/dataset/hausnummernliste)

- [Open Data Münster Street List](https://opendata.stadt-muenster.de/dataset/straßenliste/resource/eff542d9-a626-4499-89c8-65b22e1b9d1c)

First we combined the Open Data Münster House numbers with the Street List to get the addresses. Then we calculated our route graph with the street network data combined wiht the addresses.

## Papers

- [Berechnung sicherer Fahrradwege](https://arxiv.org/pdf/2403.18363)
from Dr. Sudhoff Santos and Kroll

With this paper we divided the streets into different safety categeories.

- [On Cycling Risk and Discomfort: Urban Safety Mapping
and Bike Route Recommendations](https://arxiv.org/pdf/1905.08775) from Castells-Graells et al.

- [A Hybrid Model for Evaluating the Bikeability of Urban Bicycle Systems](https://www.mdpi.com/2075-1680/12/2/155) from Hsu et al.

The other two papers were used for research purposes because, in the beginning, we did not have a clear plan on how to weight the street network.

## For Further Developement

How to start your local application:

Ensure that you have Node (Version 18 or later) and pnpm (Version 9.x) installed.

Then execute the following commands to get started:

```bash
$ git clone https://github.com/LHesse-UM/SaBiNE.git            # Clone the repository
$ cd opt                                                       # Navigate to opt-Folder
$ pnpm install                                                 # Install dependencies
$ pnpm run dev                                                 # Launch development server
```

## Onboarding

**1. Enter Start and Destination Address**

The "Enter Start and Destination Address" interface allows users to input their starting and destination points. The address suggestions are within the two predefined zones in Münster and the system automatically suggests destination addresses located in the same area as the starting address for convenience.

![placeholder](documenting/EnterStartAndDestinationAddress.png)

**2. Route Preference**

In the "Route Preferences" interface, users can adjust a slider to select their preferred route type: Safest, Balanced, or Fastest, based on their individual needs.

![placeholder](documenting/RoutePreferences.png)

**3. Start**

By clicking the "Go!" button, the system calculates the route based on your selected preferences and displays it on the map.

![placeholder](documenting/Start.png)

**4. Route Rating**

The safety rating is calculated by evaluating the absolute length of the route across the different categories of streets, each weighted according to its safety level. These weights reflect the relative risk associated with each type of street.

The final rating is then translated into a grading system similar to school grades, where:
- 1.0 represents the safest and most optimal rating.
- 6.0 represents the least safe rating.


By selecting the **safest** route the Route Rating interface shows the Safety Rating of 1.0 and the distance of 2.18km and time of about 9 minutes.

![placeholder](documenting/Safest.png)

By selecting the **balenced** route the Route Rating interface shows the Safety Rating of 1.9 and the distance of 1.69km and time of about 7 minutes.

![placeholder](documenting/Balanced.png)

By selecting the **fastest** route the Route Rating interface shows the Safety Rating of 3.0 and the distance of 1.49km and time of about 6 minutes.

![placeholder](documenting/Fastest.png)

**5. Options**

The "Options" interface provides additional controls to enhance the user experience. It includes a "Reset Input" button that clears all entered data, allowing users to start fresh. Additionally, there is a toggle switch to enable or disable the display of Street Safety Categories on the map, providing more detailed insights into the safety aspects of the route.

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

You may read the full license in the [LICENSE](LICENSE) file included in this repository or visit the official [Apache 2.0 License](http://www.apache.org/licenses/LICENSE-2.0).

## Contact

If you have any questions, feedback, or suggestions, please feel free to reach out to us:

- **tkrumrei**: [GitHub Profile](https://github.com/tkrumrei)
- **LHesse-UM**: [GitHub Profile](https://github.com/LHesse-UM)
- **tlehman1**: [GitHub Profile](https://github.com/tlehman1)

We appreciate your interest in **SaBiNE** and look forward to your feedback!
