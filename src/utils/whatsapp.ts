export function whatsappUrl(telefono: string, mensaje?: string): string {
  const digits = telefono.replace(/\D/g, "");
  return mensaje
    ? `https://wa.me/${digits}?text=${encodeURIComponent(mensaje)}`
    : `https://wa.me/${digits}`;
}

export function sanTelmoReconexionMensaje(nombre: string): string {
  const primerNombre = nombre.trim().split(/\s+/)[0] || "";
  const saludo = primerNombre ? `¡Hola ${primerNombre}!` : "¡Hola!";
  return `${saludo} 👋 Soy de Club de Emprendedores. Hace un tiempo hablamos y nos contaste que San Fernando te quedaba lejos. ¡Tenemos novedades! 🎉 Abrimos un nuevo espacio en San Telmo, mucho más cerca de Capital. ¿Te gustaría que te cuente más?`;
}
