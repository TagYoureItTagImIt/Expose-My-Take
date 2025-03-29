interface Season {
  label: string;
  startDate: Date;
  endDate: Date;
}

interface LeagueSeasons {
  [key: string]: Season;
}

const getCurrentUpcomingSeason = (sport: string): Season => {
  const now = new Date();
  
  switch (sport) {
    case 'MLB':
      // MLB season typically runs April to October
      const mlbYear = now.getMonth() >= 9 ? now.getFullYear() + 1 : now.getFullYear();
      return {
        label: `${mlbYear} Season`,
        startDate: new Date(mlbYear, 3, 1), // April 1st
        endDate: new Date(mlbYear, 9, 31), // October 31st
      };
    
    case 'NFL':
      // NFL season typically runs September to February
      const nflYear = now.getMonth() >= 1 ? now.getFullYear() : now.getFullYear() - 1;
      return {
        label: `${nflYear}-${(nflYear + 1).toString().slice(2)} Season`,
        startDate: new Date(nflYear, 8, 1), // September 1st
        endDate: new Date(nflYear + 1, 1, 28), // February 28th
      };
    
    case 'NBA':
      // NBA season typically runs October to June
      const nbaYear = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;
      return {
        label: `${nbaYear}-${(nbaYear + 1).toString().slice(2)} Season`,
        startDate: new Date(nbaYear, 9, 1), // October 1st
        endDate: new Date(nbaYear + 1, 5, 30), // June 30th
      };
    
    case 'NHL':
      // NHL season typically runs October to June
      const nhlYear = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;
      return {
        label: `${nhlYear}-${(nhlYear + 1).toString().slice(2)} Season`,
        startDate: new Date(nhlYear, 9, 1), // October 1st
        endDate: new Date(nhlYear + 1, 5, 30), // June 30th
      };
    
    default:
      throw new Error('Invalid sport');
  }
};

export const getUpcomingSeason = (sport: string): Season | null => {
  const season = getCurrentUpcomingSeason(sport);
  const now = new Date();
  
  // Only return the season if we're before its start date
  return now < season.startDate ? season : null;
}; 