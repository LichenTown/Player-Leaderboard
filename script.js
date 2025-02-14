document.addEventListener("DOMContentLoaded", () => {
  const loadLeaderboardButton = document.getElementById("load-leaderboard");
  const categorySelect = document.getElementById("category");
  const criteriaSelect = document.getElementById("criteria");
  const leaderboardTableBody = document
    .getElementById("leaderboard")
    .querySelector("tbody");
  const firstPlaceAvatar = document.getElementById("first-place-avatar");
  const secondPlaceAvatar = document.getElementById("second-place-avatar");
  const thirdPlaceAvatar = document.getElementById("third-place-avatar");
  const firstPlaceName = document.getElementById("first-place-name");
  const secondPlaceName = document.getElementById("second-place-name");
  const thirdPlaceName = document.getElementById("third-place-name");
  const loadingOverlay = document.querySelector(".loading-overlay");

  const podiumItems = document.querySelectorAll(".podium-item");

  if (
    !loadLeaderboardButton ||
    !categorySelect ||
    !criteriaSelect ||
    !leaderboardTableBody ||
    !firstPlaceAvatar ||
    !secondPlaceAvatar ||
    !thirdPlaceAvatar ||
    !firstPlaceName ||
    !secondPlaceName ||
    !thirdPlaceName ||
    !loadingOverlay
  ) {
    console.error(
      "One or more DOM elements were not found. Check your HTML IDs and class names."
    );
    return;
  }

  let usernameMap = {};
  let allCategories = [];
  let allCriteria = {};

  function findStat(statsObj, category, criterion) {
    if (statsObj && statsObj[category] && statsObj[category][criterion]) {
      return statsObj[category][criterion];
    }
    return null;
  }

  function formatTime(seconds) {
    const days = Math.floor(seconds / (60 * 60 * 24));
    seconds -= days * (60 * 60 * 24);
    const hours = Math.floor(seconds / (60 * 60));
    seconds -= hours * (60 * 60);
    const minutes = Math.floor(seconds / 60);
    seconds -= minutes * 60;
    return `${days}d ${hours}h ${minutes}m ${Math.floor(seconds)}s`;
  }

  function formatNumber(number) {
    return number.toLocaleString();
  }

  async function fetchAllData() {
    loadingOverlay.style.display = "flex";
    try {
      const [usernamesResponse, allUUIDsResponse] = await Promise.all([
        fetch(
          `https://raw.githubusercontent.com/LichenTown/player-stats/main/username_map.json`
        ), // Fetch from player-stats
        fetch(
          `https://raw.githubusercontent.com/LichenTown/player-stats/main/uuid-list.json`
        ), // Fetch from player-stats
      ]);

      if (!usernamesResponse.ok)
        throw new Error(
          `Error fetching usernames: ${usernamesResponse.status}`
        );
      if (!allUUIDsResponse.ok)
        throw new Error(`Error fetching UUIDs: ${allUUIDsResponse.status}`);

      usernameMap = await usernamesResponse.json();
      const allUUIDs = await allUUIDsResponse.json();

      allCategories = [];
      allCriteria = {};
      for (const uuid of allUUIDs) {
        const statsResponse = await fetch(
          `https://raw.githubusercontent.com/LichenTown/player-stats/main/stats/${uuid}.json`
        );
        if (!statsResponse.ok) {
          console.warn(`Stats not found for UUID: ${uuid}`);
          continue;
        }
        const statsData = await statsResponse.json();
        const stats = statsData.stats;

        if (stats) {
          for (const categoryId in stats) {
            if (Object.hasOwn(stats, categoryId)) {
              const categoryDisplay = categoryId
                .replace("minecraft:", "")
                .replace(/_/g, " ")
                .replace(/\b\w/g, (c) => c.toUpperCase());
              if (!allCategories.find((cat) => cat.id === categoryId)) {
                allCategories.push({
                  id: categoryId,
                  display: categoryDisplay,
                });
              }

              if (!allCriteria[categoryId]) {
                allCriteria[categoryId] = [];
              }
              for (const criterionId in stats[categoryId]) {
                if (Object.hasOwn(stats[categoryId], criterionId)) {
                  const criterionDisplay = criterionId
                    .replace("minecraft:", "")
                    .replace(/_/g, " ")
                    .replace(/\b\w/g, (c) => c.toUpperCase());
                  if (
                    !allCriteria[categoryId].find(
                      (crit) => crit.id === criterionId
                    )
                  ) {
                    //check by ID
                    allCriteria[categoryId].push({
                      id: criterionId,
                      display: criterionDisplay,
                    });
                  }
                }
              }
            }
          }
        }
      }
      return allUUIDs;
    } catch (error) {
      console.error("Error fetching initial data:", error);
      alert("Failed to load initial data. Please refresh the page.");
      loadingOverlay.style.display = "none";
      throw error;
    }
  }

  async function populateCategories() {
    try {
      await fetchAllData();

      if (allCategories.length > 0) {
        allCategories.forEach((category) => {
          categorySelect.add(new Option(category.display, category.id));
        });
        categorySelect.value = "minecraft:custom";
        populateCriteria("minecraft:custom");
        criteriaSelect.disabled = false;
      } else {
        console.warn("No categories found. Cannot populate categories.");
      }
    } catch (error) {
      console.error("Error populating categories:", error);
    } finally {
      loadingOverlay.style.display = "none";
    }
  }

  function populateCriteria(selectedCategory) {
    criteriaSelect.innerHTML = "";

    if (allCriteria[selectedCategory]) {
      allCriteria[selectedCategory].forEach((criterion) => {
        criteriaSelect.add(new Option(criterion.display, criterion.id));
      });
    }
    if (
      allCriteria[selectedCategory] &&
      allCriteria[selectedCategory].find((c) => c.id == "minecraft:play_time")
    ) {
      criteriaSelect.value = "minecraft:play_time";
    }
  }

  categorySelect.addEventListener("change", (event) => {
    populateCriteria(event.target.value);
  });

  loadLeaderboardButton.addEventListener("click", loadLeaderboard);

  async function loadLeaderboard() {
    loadingOverlay.style.display = "flex";

    const category = categorySelect.value;
    const criterion = criteriaSelect.value;

    if (!category || !criterion) {
      alert("Please select both a category and criteria.");
      loadingOverlay.style.display = "none";
      return;
    }

    try {
      const allUUIDsResponse = await fetch(
        `https://raw.githubusercontent.com/LichenTown/player-stats/main/uuid-list.json`
      );
      if (!allUUIDsResponse.ok) {
        throw new Error(`Error fetching UUIDs: ${allUUIDsResponse.status}`);
      }
      const allUUIDs = await allUUIDsResponse.json();

      let leaderboardData = [];

      for (const uuid of allUUIDs) {
        const statsResponse = await fetch(
          `https://raw.githubusercontent.com/LichenTown/player-stats/main/stats/${uuid}.json`
        );
        if (!statsResponse.ok) {
          continue;
        }

        const statsData = await statsResponse.json();
        const statValue = findStat(statsData.stats, category, criterion);

        if (statValue !== null && statValue > 0) {
          const username = usernameMap[uuid] || "Unknown";
          leaderboardData.push({
            uuid,
            username,
            value: statValue,
          });
        }
      }

      leaderboardData.sort((a, b) => b.value - a.value);

      updatePodium(leaderboardData);
      displayLeaderboard(leaderboardData, `${category}:${criterion}`);
    } catch (error) {
      console.error("Error loading leaderboard:", error);
      alert("An error occurred while loading the leaderboard.");
    } finally {
      loadingOverlay.style.display = "none";
    }
  }
  function updatePodium(leaderboardData) {
    firstPlaceName.textContent = "";
    secondPlaceName.textContent = "";
    thirdPlaceName.textContent = "";

    if (leaderboardData.length > 0) {
      firstPlaceAvatar.src = `https://mc-heads.net/head/${leaderboardData[0].uuid}/512`;
      firstPlaceAvatar.alt = `${leaderboardData[0].username} (1st Place)`;
      firstPlaceName.textContent = leaderboardData[0].username;
    } else {
      firstPlaceAvatar.src = "https://placehold.co/150x150/png?text=1st";
      firstPlaceAvatar.alt = "1st Place";
    }

    if (leaderboardData.length > 1) {
      secondPlaceAvatar.src = `https://mc-heads.net/head/${leaderboardData[1].uuid}/512`;
      secondPlaceAvatar.alt = `${leaderboardData[1].username} (2nd Place)`;
      secondPlaceName.textContent = leaderboardData[1].username;
    } else {
      secondPlaceAvatar.src = "https://placehold.co/150x150/png?text=2nd";
      secondPlaceAvatar.alt = "2nd Place";
    }

    if (leaderboardData.length > 2) {
      thirdPlaceAvatar.src = `https://mc-heads.net/head/${leaderboardData[2].uuid}/512`;
      thirdPlaceAvatar.alt = `${leaderboardData[2].username} (3rd Place)`;
      thirdPlaceName.textContent = leaderboardData[2].username;
    } else {
      thirdPlaceAvatar.src = "https://placehold.co/150x150/png?text=3rd";
      thirdPlaceAvatar.alt = "3rd Place";
    }
  }

  function displayLeaderboard(data, criteria) {
    leaderboardTableBody.innerHTML = "";

    if (data.length === 0) {
      leaderboardTableBody.innerHTML =
        "<tr><td colspan='3'>No data found for this criteria.</td></tr>";
      return;
    }

    data.forEach((entry, index) => {
      const row = document.createElement("tr");
      const rankCell = document.createElement("td");
      const playerCell = document.createElement("td");
      const valueCell = document.createElement("td");

      rankCell.textContent = index + 1;
      playerCell.textContent = entry.username;
      valueCell.textContent = criteria.endsWith(":play_time")
        ? formatTime(entry.value / 20)
        : formatNumber(entry.value);

      row.appendChild(rankCell);
      row.appendChild(playerCell);
      row.appendChild(valueCell);
      leaderboardTableBody.appendChild(row);
    });
  }

  podiumItems.forEach((item) => {
    item.addEventListener("mouseover", () => {
      const avatar = item.querySelector(".podium-avatar");
      if (avatar) {
        avatar.classList.add("dancing");
      }
    });
    item.addEventListener("mouseout", () => {
      const avatar = item.querySelector(".podium-avatar");
      if (avatar) {
        avatar.classList.remove("dancing");
      }
    });
  });

  populateCategories();
});

async function displayLastCommitDate() {
  try {
    const response = await fetch(
      `https://api.github.com/repos/LichenTown/Player-Leaderboard/commits?per_page=1`
    );
    if (!response.ok) {
      throw new Error(`GitHub API Error: ${response.status}`);
    }
    const data = await response.json();

    if (data.length > 0) {
      const commitDate = new Date(data[0].commit.committer.date);
      const formattedDate = formatDate(commitDate);
      document.getElementById(
        "last-updated"
      ).textContent = `Last Updated: ${formattedDate}`;
    } else {
      document.getElementById("last-updated").textContent = "Last Updated: N/A";
    }
  } catch (error) {
    console.error("Error fetching commit data:", error);
    document.getElementById("last-updated").textContent = "Last Updated: Error";
  }
}

function formatDate(date) {
  const options = {
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  return date.toLocaleDateString(undefined, options);
}

displayLastCommitDate();
