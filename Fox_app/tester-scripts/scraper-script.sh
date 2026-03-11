#!/bin/bash
################################
# script to collect information required for dashboard and compile it into a json file
# 	- by Rohan J Hopper
#	started 2025-01-07
################################

#path to various files
TEMPLATE=blank-tester-to-server-format.json
CFGPATH=/mnt/nv/mods/test/cfg/  	#path for actual tester machine
#CFGPATH=.							#path for Rohan's testing
LOCAL_LOGPATH=/mnt/nv/logs/

#create destination filename and save as variable
NEWFILENAME="$(hostname)_$(date +"%Y%m%d_%H%M%S").json"
echo "creating blank: $NEWFILENAME"
cp $TEMPLATE $NEWFILENAME		#copy blank template to file with the new name


#gather information about fixture, cards, etc. give each one a variable
FIXTURENAME=$(hostname)
echo $FIXTURENAME
GENTYPE=$(dmidecode -s system-product-name | sed -e 's/PW-TOM-B-ATX-G5/Gen 5 B tester/' -e 's/TOM-B-ATX/Gen 3 B tester/')
echo $GENTYPE
RACKNO="Rack-"$(hostname | cut -c 8-9)					#this seems pointless as fixture name already contains rack information. I'd like to get rid of it.
echo $RACKNO
FIXTURESN=$(dmidecode -s system-serial-number)			#easier to read than grepping from serial number in dmdidecodee -t system
echo $FIXTURESN
IPADDR=$(hostname -i)              						#doesn't work on gen3 tester? need tofind more portable method i guuess
echo $IPADDR
MACADDR=$(ifconfig | grep ether | awk '{print $2}')     #should I use ifconfig for IPADDR also?
echo $MACADDR
CREATOR="tester"



if [[ $(grep operator_id $CFGPATH/cfg.ini | sed 's/.*= *//') == "DEBUG001" ]]; then
	TESTTYPE="Debug"
#elif [[ idk what the condition for sort should be ]]; then 	#TODO: determine SORT indicator
#	TESTTYPE="Sort"
else
	TESTTYPE="Refurbish"                   					
fi




echo "getting individual GPU info"
#gather information about the units in each slot
if [[ -z $(grep 5 <<< $GENTYPE) ]];then	#this is a gen 3 tester if there isn't a 5
	LEFTPORT=$(lspci | grep 65 | awk '{ print $1 }')
	RIGHTPORT=$(lspci | grep b3 | awk '{ print $1 }')
	if [[ -n $LEFTPORT ]];then	#there is something in the left slot
		echo "gen3 left port at: $LEFTPORT"
		LEFTINFO=$(/mnt/nv/nvflash_mfg -B $LEFTPORT --rdobd | grep "BoardPartNumber\|BoardSerialNumber\|Board699PartNumber")
		LEFTPN=$(sed -e 's/: /:/g' -e 's/ /\n/g' <<< $LEFTINFO | grep -m 1 BoardPartNumber | awk -F ":" '{ print $2}')
		LEFtSN=$(sed -e 's/: /:/g' -e 's/ /\n/g' <<< $LEFTINFO | grep -m 1 BoardSerialNumber | awk -F ":" '{ print $2}')
		LEFT699=$(sed -e 's/: /:/g' -e 's/ /\n/g' <<< $LEFTINFO | grep Board699PartNumber | awk -F ":" '{ print $2}')
		LEFTLOG=
		fi
	if [[ -n $RIGHTPORT ]];then	#there is something in the right slot
		echo "gen3 right port at: $RIGHTPORT"
		RIGHTINFO=$(/mnt/nv/nvflash_mfg -B $RIGHTPORT --rdobd | grep "BoardPartNumber\|BoardSerialNumber\|Board699PartNumber")
		RIGHTPN=$(sed -e 's/: /:/g' -e 's/ /\n/g' <<< $RIGHTINFO | grep -m 1 BoardPartNumber | awk -F ":" '{ print $2}')
		RIGHTSN=$(sed -e 's/: /:/g' -e 's/ /\n/g' <<< $RIGHTINFO | grep -m 1 BoardSerialNumber | awk -F ":" '{ print $2}')
		RIGHT699=$(sed -e 's/: /:/g' -e 's/ /\n/g' <<< $RIGHTINFO | grep Board699PartNumber | awk -F ":" '{ print $2}')
		RIGHTLOG=
	fi
else		#if this isn't a Gen3 tester it must be a Gen5
	LEFTPORT=$(lspci | grep 17 | awk '{ print $1 }')
	RIGHTPORT=$(lspci | grep 9b | awk '{ print $1 }')
	if [[ -n $LEFTPORT ]];then	#there is something in the left slot
		LEFTINFO=$(/mnt/nv/nvflash_mfg -B $LEFTPORT --rdobd | grep "BoardPartNumber\|BoardSerialNumber\|Board699PartNumber")
		LEFTPN=$(sed -e 's/: /:/g' -e 's/ /\n/g' <<< $LEFTINFO | grep -m 1 BoardPartNumber | awk -F ":" '{ print $2}')
		LEFTSN=$(sed -e 's/: /:/g' -e 's/ /\n/g' <<< $LEFTINFO | grep -m 1 BoardSerialNumber | awk -F ":" '{ print $2}')
		LEFT699=$(sed -e 's/: /:/g' -e 's/ /\n/g' <<< $LEFTINFO | grep Board699PartNumber | awk -F ":" '{ print $2}')
		LEFTLOG=
	fi
	if [[ -n $RIGHTPORT ]];then	#there is something in the right slot
		echo "checking right slot at port: $RIGHTPORT"
		RIGHTINFO=$(/mnt/nv/nvflash_mfg -B $RIGHTPORT --rdobd | grep "BoardPartNumber\|BoardSerialNumber\|Board699PartNumber")
		RIGHTPN=$(sed -e 's/: /:/g' -e 's/ /\n/g' <<< $RIGHTINFO | grep -m 1 BoardPartNumber | awk -F ":" '{ print $2}')
		RIGHTSN=$(sed -e 's/: /:/g' -e 's/ /\n/g' <<< $RIGHTINFO | grep -m 1 BoardSerialNumber | awk -F ":" '{ print $2}')
		RIGHT699=$(sed -e 's/: /:/g' -e 's/ /\n/g' <<< $RIGHTINFO | grep Board699PartNumber | awk -F ":" '{ print $2}')
		RIGHTLOG=
	fi

fi


if [[ -n $LEFTSN ]]; then
echo "Current station from left"
	CURRENTSTATION=$(grep current_stc_name $CFGPATH$LEFTSN.RSP | sed 's/current_stc_name=//')
elif [[ -n $RIGHTSN ]]; then
echo "Current station from right"
	CURRENTSTATION=$(grep current_stc_name $CFGPATH$RIGHTSN.RSP | sed 's/current_stc_name=//')
fi

echo "beginning replacement"
#run the sed replacements on the newly created template file, using the variables that were just created for each field
sed -i "s/fixture_name.*/fixture_name\":\"$FIXTURENAME\",/" $NEWFILENAME
sed -i "s/gen_type.*/gen_type\":\"$GENTYPE\",/" $NEWFILENAME
sed -i "s/rack.*/rack\":\"$RACKNO\",/" $NEWFILENAME
sed -i "s/fixture_sn.*/fixture_sn\":\"$FIXTURESN\",/" $NEWFILENAME
sed -i "s/test_type.*/test_type\":\"$TESTTYPE\",/" $NEWFILENAME
sed -i "s/test_station.*/test_station\":\"$CURRENTSTATION\",/" $NEWFILENAME
sed -i "s/ip_address.*/ip_address\":\"$IPADDR\",/" $NEWFILENAME
sed -i "s/mac_address.*/mac_address\":\"$MACADDR\",/" $NEWFILENAME
sed -i "s/creator.*/creator\":\"$CREATOR\",/" $NEWFILENAME

sed -i "s/left-PN.*/left-PN\":\"$LEFTPN\",/" $NEWFILENAME
sed -i "s/left-SN.*/left-SN\":\"$LEFTSN\",/" $NEWFILENAME
sed -i "s/left-logpath.*/left-logpath\":\"$LEFTLOG\",/" $NEWFILENAME

sed -i "s/right-PN.*/right-PN\":\"$RIGHTPN\",/" $NEWFILENAME
sed -i "s/right-SN.*/right-SN\":\"$RIGHTSN\",/" $NEWFILENAME
sed -i "s/right-logpath.*/right-logpath\":\"$RIGHTLOG\"/" $NEWFILENAME

echo "done :]"
