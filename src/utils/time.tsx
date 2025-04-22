export const secondsToHms = (sec: number) => {
    const h   = Math.floor(sec / 3600);
    const m   = Math.floor((sec % 3600) / 60);
    return `${h}h ${m}m`;
  };